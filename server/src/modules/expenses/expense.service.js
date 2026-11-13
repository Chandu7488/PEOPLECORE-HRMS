import { ExpenseClaim } from './expense.model.js';
import { Employee } from '../employees/employee.model.js';
import { recordAuditLog } from '../audit/audit.model.js';

export class ExpenseService {
  async generateClaimNumber(orgId) {
    const year = new Date().getFullYear();
    const count = await ExpenseClaim.countDocuments({ organizationId: orgId });
    return `EXP-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  async submitClaim(orgId, employeeId, data, actorUserId = null) {
    const claimNumber = await this.generateClaimNumber(orgId);

    const claim = await ExpenseClaim.create({
      organizationId: orgId,
      claimNumber,
      employeeId,
      title: data.title,
      category: data.category || 'TRAVEL',
      amount: Number(data.amount) || 0,
      expenseDate: data.expenseDate || new Date(),
      receiptUrl: data.receiptUrl || '',
      status: 'SUBMITTED',
      remarks: data.remarks || '',
    });

    await recordAuditLog({
      organizationId: orgId,
      userId: actorUserId,
      action: 'EXPENSE_CLAIM_SUBMITTED',
      entity: 'ExpenseClaim',
      entityId: claim._id,
      metadata: { claimNumber: claim.claimNumber, amount: claim.amount },
    });

    return claim;
  }

  async getClaims(orgId, filters = {}, user) {
    const isPrivileged =
      user.roles.includes('SUPER_ADMIN') ||
      user.roles.includes('HR_ADMIN') ||
      user.roles.includes('HR_EXECUTIVE') ||
      user.roles.includes('MANAGER');

    const query = { organizationId: orgId };

    if (!isPrivileged) {
      const emp = await Employee.findOne({ organizationId: orgId, userId: user._id });
      if (!emp) return [];
      query.employeeId = emp._id;
    } else if (filters.employeeId) {
      query.employeeId = filters.employeeId;
    }

    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    if (filters.category && filters.category !== 'ALL') {
      query.category = filters.category;
    }

    return await ExpenseClaim.find(query)
      .populate('employeeId', 'firstName lastName employeeCode workEmail')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
  }

  async reviewClaim(orgId, claimId, { status, remarks }, reviewerUser) {
    const claim = await ExpenseClaim.findOne({ _id: claimId, organizationId: orgId });
    if (!claim) {
      const err = new Error('Expense claim not found');
      err.statusCode = 404;
      throw err;
    }

    claim.status = status;
    claim.reviewedBy = reviewerUser._id;
    claim.reviewedAt = new Date();
    if (remarks) claim.remarks = remarks;

    await claim.save();

    await recordAuditLog({
      organizationId: orgId,
      userId: reviewerUser._id,
      action: 'EXPENSE_CLAIM_REVIEWED',
      entity: 'ExpenseClaim',
      entityId: claim._id,
      metadata: { status: claim.status, amount: claim.amount },
    });

    return claim;
  }
}

export const expenseService = new ExpenseService();
