import { Asset } from './asset.model.js';
import { Employee } from '../employees/employee.model.js';
import { recordAuditLog } from '../audit/audit.model.js';

export class AssetService {
  async generateAssetTag(orgId, category = 'AST') {
    const prefix = category.substring(0, 3).toUpperCase();
    const count = await Asset.countDocuments({ organizationId: orgId });
    return `AST-${prefix}-${String(count + 1).padStart(3, '0')}`;
  }

  async createAsset(orgId, data, actorUserId = null) {
    let assetTag = data.assetTag?.trim().toUpperCase();
    if (!assetTag) {
      assetTag = await this.generateAssetTag(orgId, data.category || 'LAPTOP');
    }

    const asset = await Asset.create({
      organizationId: orgId,
      assetTag,
      name: data.name,
      category: data.category || 'LAPTOP',
      serialNumber: data.serialNumber || '',
      purchaseDate: data.purchaseDate || new Date(),
      cost: Number(data.cost) || 0,
      status: data.allocatedTo ? 'ALLOCATED' : (data.status || 'AVAILABLE'),
      allocatedTo: data.allocatedTo || null,
      allocatedAt: data.allocatedTo ? new Date() : null,
      notes: data.notes || '',
    });

    await recordAuditLog({
      organizationId: orgId,
      userId: actorUserId,
      action: 'ASSET_CREATED',
      entity: 'Asset',
      entityId: asset._id,
      metadata: { assetTag: asset.assetTag, name: asset.name },
    });

    return asset;
  }

  async getAssets(orgId, filters = {}, user) {
    const isPrivileged =
      user.roles.includes('SUPER_ADMIN') ||
      user.roles.includes('HR_ADMIN') ||
      user.roles.includes('HR_EXECUTIVE') ||
      user.roles.includes('MANAGER');

    const query = { organizationId: orgId };

    if (!isPrivileged) {
      const emp = await Employee.findOne({ organizationId: orgId, userId: user._id });
      if (!emp) return [];
      query.allocatedTo = emp._id;
    } else if (filters.allocatedTo) {
      query.allocatedTo = filters.allocatedTo;
    }

    if (filters.category && filters.category !== 'ALL') {
      query.category = filters.category;
    }

    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    if (filters.search) {
      const regex = new RegExp(filters.search, 'i');
      query.$or = [{ name: regex }, { assetTag: regex }, { serialNumber: regex }];
    }

    return await Asset.find(query)
      .populate('allocatedTo', 'firstName lastName employeeCode workEmail')
      .sort({ createdAt: -1 });
  }

  async allocateAsset(orgId, assetId, employeeId, actorUserId = null) {
    const asset = await Asset.findOne({ _id: assetId, organizationId: orgId });
    if (!asset) {
      const err = new Error('Asset not found');
      err.statusCode = 404;
      throw err;
    }

    asset.allocatedTo = employeeId;
    asset.allocatedAt = new Date();
    asset.status = 'ALLOCATED';
    await asset.save();

    await recordAuditLog({
      organizationId: orgId,
      userId: actorUserId,
      action: 'ASSET_ALLOCATED',
      entity: 'Asset',
      entityId: asset._id,
      metadata: { assetTag: asset.assetTag, employeeId },
    });

    return asset;
  }

  async returnAsset(orgId, assetId, notes = '', actorUserId = null) {
    const asset = await Asset.findOne({ _id: assetId, organizationId: orgId });
    if (!asset) {
      const err = new Error('Asset not found');
      err.statusCode = 404;
      throw err;
    }

    asset.allocatedTo = null;
    asset.allocatedAt = null;
    asset.status = 'AVAILABLE';
    if (notes) asset.notes = notes;
    await asset.save();

    await recordAuditLog({
      organizationId: orgId,
      userId: actorUserId,
      action: 'ASSET_RETURNED',
      entity: 'Asset',
      entityId: asset._id,
      metadata: { assetTag: asset.assetTag },
    });

    return asset;
  }
}

export const assetService = new AssetService();
