import { AuditLog } from './audit.model.js';

/**
 * Enterprise System Audit Trail Service
 * Provides compliance inspection and forensic activity querying
 */
export class AuditService {
  async getAuditLogs(filters = {}) {
    const query = {};

    if (filters.action && filters.action !== 'ALL') {
      query.action = filters.action;
    }

    if (filters.actorEmail) {
      query.actorEmail = new RegExp(filters.actorEmail.trim(), 'i');
    }

    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 30));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorId', 'firstName lastName email roles')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getAuditSummary() {
    const totalEvents = await AuditLog.countDocuments();
    const actionCounts = await AuditLog.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEvents = await AuditLog.countDocuments({ timestamp: { $gte: todayStart } });

    return {
      totalEvents,
      todayEvents,
      actionCounts,
    };
  }
}

export const auditService = new AuditService();
