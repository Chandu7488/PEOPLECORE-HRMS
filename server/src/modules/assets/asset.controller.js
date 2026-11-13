import { assetService } from './asset.service.js';

export const createAssetController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const asset = await assetService.createAsset(orgId, req.body, req.user._id);
    res.status(201).json({
      success: true,
      data: asset,
      message: 'Asset cataloged successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getAssetsController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const assets = await assetService.getAssets(orgId, req.query, req.user);
    res.status(200).json({
      success: true,
      data: assets,
      message: 'Assets retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const allocateAssetController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const asset = await assetService.allocateAsset(orgId, req.params.id, req.body.employeeId, req.user._id);
    res.status(200).json({
      success: true,
      data: asset,
      message: 'Asset successfully allocated to employee',
    });
  } catch (err) {
    next(err);
  }
};

export const returnAssetController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const asset = await assetService.returnAsset(orgId, req.params.id, req.body.notes, req.user._id);
    res.status(200).json({
      success: true,
      data: asset,
      message: 'Asset custody returned and marked available',
    });
  } catch (err) {
    next(err);
  }
};
