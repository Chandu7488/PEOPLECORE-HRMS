import { Notice } from './notice.model.js';
import { NoticeReceipt } from './noticeReceipt.model.js';
import { NoticeComment } from './noticeComment.model.js';
import { Employee } from '../employees/employee.model.js';
import { sanitizeHtml } from '../../utils/sanitize.js';
import { recordAuditLog } from '../audit/audit.model.js';
import { ROLES } from '../../config/roles.js';

/**
 * Notice Board Service
 * Implements audience targeting, sanitized rich text, and acknowledgement tracking (Section 4.15)
 */
export class NoticeService {
  /**
   * Evaluates if a user/employee is within the intended notice audience
   */
  isUserInAudience(notice, user, employee) {
    if (!notice || !user) return false;

    // Super Admin and HR Admin have unrestricted access
    if (user.roles.includes(ROLES.SUPER_ADMIN) || user.roles.includes(ROLES.HR_ADMIN)) {
      return true;
    }

    // Author always has access to their own notice
    if (notice.authorId.toString() === user._id.toString()) {
      return true;
    }

    const { type, targetIds = [] } = notice.audience || { type: 'ALL', targetIds: [] };

    if (type === 'ALL') return true;

    if (type === 'LOCATIONS' && employee?.locationId) {
      return targetIds.some((id) => id.toString() === employee.locationId.toString());
    }

    if (type === 'DEPARTMENTS' && employee?.departmentId) {
      return targetIds.some((id) => id.toString() === employee.departmentId.toString());
    }

    if (type === 'ROLES') {
      // In roles audience, targetIds can be matched or mapped
      return true;
    }

    return false;
  }

  /**
   * Retrieves notices scoped to current user's audience
   */
  async getNoticesForUser(orgId, user, employee = null) {
    const isElevated = user.roles.includes(ROLES.SUPER_ADMIN) || user.roles.includes(ROLES.HR_ADMIN);

    const query = { organizationId: orgId };

    if (!isElevated) {
      query.status = 'PUBLISHED';
      query.publishAt = { $lte: new Date() };
      query.$or = [{ expireAt: null }, { expireAt: { $gt: new Date() } }];
    }

    const allNotices = await Notice.find(query)
      .populate('authorId', 'firstName lastName email')
      .sort({ isPinned: -1, publishAt: -1 });

    // Filter by audience on the server
    const accessibleNotices = allNotices.filter((n) => this.isUserInAudience(n, user, employee));

    // Attach current employee's receipt info
    if (employee) {
      const receipts = await NoticeReceipt.find({
        employeeId: employee._id,
        noticeId: { $in: accessibleNotices.map((n) => n._id) },
      });
      const receiptMap = new Map(receipts.map((r) => [r.noticeId.toString(), r]));

      return accessibleNotices.map((n) => {
        const obj = n.toJSON();
        const r = receiptMap.get(n._id.toString());
        obj.hasRead = !!r?.firstReadAt;
        obj.acknowledgedAt = r?.acknowledgedAt || null;
        return obj;
      });
    }

    return accessibleNotices;
  }

  /**
   * Creates a new company notice with sanitized HTML body and role verification
   */
  async createNotice(orgId, authorUser, noticeData) {
    const sanitizedBody = sanitizeHtml(noticeData.bodyHtml);

    // Determine initial status based on role
    let initialStatus = 'PUBLISHED';
    if (authorUser.roles.includes(ROLES.HR_EXECUTIVE)) {
      initialStatus = 'PENDING_APPROVAL';
    } else if (noticeData.status === 'DRAFT') {
      initialStatus = 'DRAFT';
    }

    const notice = await Notice.create({
      organizationId: orgId,
      title: noticeData.title,
      bodyHtml: sanitizedBody,
      category: noticeData.category || 'GENERAL',
      priority: noticeData.priority || 'NORMAL',
      audience: noticeData.audience || { type: 'ALL', targetIds: [] },
      publishAt: noticeData.publishAt ? new Date(noticeData.publishAt) : new Date(),
      expireAt: noticeData.expireAt ? new Date(noticeData.expireAt) : null,
      isPinned: !!noticeData.isPinned,
      requiresAck: !!noticeData.requiresAck,
      ackDueAt: noticeData.ackDueAt ? new Date(noticeData.ackDueAt) : null,
      commentsEnabled: noticeData.commentsEnabled !== false,
      status: initialStatus,
      authorId: authorUser._id,
      version: 1,
    });

    await recordAuditLog({
      action: 'NOTICE_CREATED',
      actorId: authorUser._id,
      targetId: notice._id.toString(),
      metadata: { title: notice.title, category: notice.category, priority: notice.priority },
    });

    return notice;
  }

  /**
   * Retrieves single notice and records first read
   */
  async getNoticeById(noticeId, user, employee = null) {
    const notice = await Notice.findById(noticeId).populate('authorId', 'firstName lastName email');
    if (!notice) {
      throw { statusCode: 404, code: 'NOTICE_NOT_FOUND', message: 'Notice not found' };
    }

    if (!this.isUserInAudience(notice, user, employee)) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You are not in the targeted audience for this notice' };
    }

    let receipt = null;
    if (employee) {
      receipt = await NoticeReceipt.findOneAndUpdate(
        { noticeId: notice._id, employeeId: employee._id },
        { $setOnInsert: { firstReadAt: new Date() } },
        { upsert: true, new: true }
      );
    }

    const obj = notice.toJSON();
    obj.hasRead = true;
    obj.acknowledgedAt = receipt?.acknowledgedAt || null;

    return obj;
  }

  /**
   * Updates notice content, sanitizes body, and captures a revision snapshot
   */
  async updateNotice(noticeId, updateData, user) {
    const notice = await Notice.findById(noticeId);
    if (!notice) {
      throw { statusCode: 404, code: 'NOTICE_NOT_FOUND', message: 'Notice not found' };
    }

    // Save previous snapshot into revisions
    notice.revisions.push({
      version: notice.version,
      editedAt: new Date(),
      editedBy: user._id,
      snapshotTitle: notice.title,
      snapshotBody: notice.bodyHtml,
    });

    if (updateData.title) notice.title = updateData.title;
    if (updateData.bodyHtml) notice.bodyHtml = sanitizeHtml(updateData.bodyHtml);
    if (updateData.category) notice.category = updateData.category;
    if (updateData.priority) notice.priority = updateData.priority;
    if (updateData.audience) notice.audience = updateData.audience;
    if (updateData.isPinned !== undefined) notice.isPinned = updateData.isPinned;
    if (updateData.requiresAck !== undefined) notice.requiresAck = updateData.requiresAck;
    if (updateData.status) notice.status = updateData.status;

    notice.version += 1;
    await notice.save();

    await recordAuditLog({
      action: 'NOTICE_UPDATED',
      actorId: user._id,
      targetId: noticeId,
      metadata: { newVersion: notice.version },
    });

    return notice;
  }

  /**
   * Acknowledges notice by an employee
   */
  async acknowledgeNotice(noticeId, employeeId) {
    const receipt = await NoticeReceipt.findOneAndUpdate(
      { noticeId, employeeId },
      { acknowledgedAt: new Date() },
      { upsert: true, new: true }
    );
    return receipt;
  }

  /**
   * Generates acknowledgement audit report for author or HR admin
   */
  async getAcknowledgementReport(noticeId, user) {
    const notice = await Notice.findById(noticeId);
    if (!notice) {
      throw { statusCode: 404, code: 'NOTICE_NOT_FOUND', message: 'Notice not found' };
    }

    const receipts = await NoticeReceipt.find({ noticeId })
      .populate('employeeId', 'firstName lastName employeeCode workEmail departmentId')
      .sort({ acknowledgedAt: -1 });

    const totalAcknowledged = receipts.filter((r) => r.acknowledgedAt !== null).length;

    return {
      notice: {
        _id: notice._id,
        title: notice.title,
        requiresAck: notice.requiresAck,
        ackDueAt: notice.ackDueAt,
      },
      summary: {
        totalReads: receipts.length,
        totalAcknowledged,
      },
      receipts,
    };
  }

  /**
   * Adds an employee comment to a notice
   */
  async addComment(noticeId, employeeId, text) {
    const notice = await Notice.findById(noticeId);
    if (!notice || !notice.commentsEnabled) {
      throw { statusCode: 400, code: 'COMMENTS_DISABLED', message: 'Comments are not enabled on this notice' };
    }

    const cleanText = (text || '').trim();
    if (!cleanText) {
      throw { statusCode: 400, code: 'EMPTY_COMMENT', message: 'Comment cannot be empty' };
    }

    const comment = await NoticeComment.create({
      noticeId,
      employeeId,
      text: cleanText,
    });

    return await comment.populate('employeeId', 'firstName lastName employeeCode');
  }

  /**
   * Retrieves comments on a notice
   */
  async getComments(noticeId) {
    return await NoticeComment.find({ noticeId, status: 'VISIBLE' })
      .populate('employeeId', 'firstName lastName employeeCode')
      .sort({ createdAt: 1 });
  }
}

export const noticeService = new NoticeService();
