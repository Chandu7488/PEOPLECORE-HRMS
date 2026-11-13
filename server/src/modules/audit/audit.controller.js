import { auditService } from './audit.service.js';

/**
 * Controller to fetch paginated audit logs with filtering
 */
export const getAuditLogsController = async (req, res, next) => {
  try {
    const { action, actorEmail, status, startDate, endDate, page, limit } = req.query;
    const result = await auditService.getAuditLogs({
      action,
      actorEmail,
      status,
      startDate,
      endDate,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
      message: 'Audit logs retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to fetch high-level audit trail metrics summary
 */
export const getAuditSummaryController = async (req, res, next) => {
  try {
    const summary = await auditService.getAuditSummary();
    res.status(200).json({
      success: true,
      data: summary,
      message: 'Audit trail summary metrics retrieved',
    });
  } catch (err) {
    next(err);
  }
};
