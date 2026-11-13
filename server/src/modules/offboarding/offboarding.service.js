import { Resignation } from './resignation.model.js';
import { OffboardingTask } from './offboardingTask.model.js';
import { Employee } from '../employees/employee.model.js';
import { User } from '../users/user.model.js';
import { LeaveLedger } from '../leave/leaveLedger.model.js';
import { recordAuditLog } from '../audit/audit.model.js';

/**
 * Offboarding & Exit Management Service
 * Implements employee resignation workflow, departmental clearance checklist, and final exit settlement
 */
export class OffboardingService {
  /**
   * Submits a new resignation request and seeds standard departmental clearance tasks
   */
  async submitResignation(orgId, employeeId, data, actorUserId = null) {
    const employee = await Employee.findOne({ _id: employeeId, organizationId: orgId });
    if (!employee) {
      const err = new Error('Employee not found or does not belong to organization');
      err.statusCode = 404;
      throw err;
    }

    // Check for existing active resignation
    const existingActive = await Resignation.findOne({
      organizationId: orgId,
      employeeId,
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] },
    });

    if (existingActive) {
      const err = new Error('An active resignation request already exists for this employee');
      err.statusCode = 409;
      throw err;
    }

    const resignationDate = data.resignationDate ? new Date(data.resignationDate) : new Date();
    const proposedLWD = new Date(data.proposedLastWorkingDay);

    // Calculate calendar days difference for notice period
    const diffTime = proposedLWD.getTime() - resignationDate.getTime();
    const noticeDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const resignation = await Resignation.create({
      organizationId: orgId,
      employeeId,
      resignationDate,
      proposedLastWorkingDay: proposedLWD,
      approvedLastWorkingDay: proposedLWD, // Default to proposed until reviewed
      noticePeriodDays: Number(data.noticePeriodDays) || noticeDays || 30,
      reasonCategory: data.reasonCategory || 'CAREER_GROWTH',
      reasonDetails: data.reasonDetails || '',
      status: 'SUBMITTED',
      settlementStatus: 'PENDING',
      handoverNotes: data.handoverNotes || '',
    });

    // Seed standard departmental clearance tasks
    const standardTasks = [
      {
        organizationId: orgId,
        resignationId: resignation._id,
        employeeId,
        category: 'IT_ASSETS',
        title: 'Return Laptop, Charger, Monitor & Hardware Accessories',
        description: 'Verify returned physical devices and wipe corporate credentials',
      },
      {
        organizationId: orgId,
        resignationId: resignation._id,
        employeeId,
        category: 'FINANCE_SETTLEMENT',
        title: 'Settle Outstanding Travel / Expense Claims & Dues',
        description: 'Verify zero pending corporate card dues or travel claim advances',
      },
      {
        organizationId: orgId,
        resignationId: resignation._id,
        employeeId,
        category: 'HR_EXIT_INTERVIEW',
        title: 'Conduct Confidential Exit Interview & Knowledge Transfer Handover',
        description: 'Collect departure feedback, review reason for leaving, and check project KT',
      },
      {
        organizationId: orgId,
        resignationId: resignation._id,
        employeeId,
        category: 'ADMIN_FACILITY',
        title: 'Return Office Access Keycards, Badges & Parking Passes',
        description: 'Physical security clearance and desk handover verification',
      },
      {
        organizationId: orgId,
        resignationId: resignation._id,
        employeeId,
        category: 'ACCESS_REVOCATION',
        title: 'Revoke Corporate Email, Google Workspace, GitHub & VPN Access',
        description: 'Scheduled deprovisioning of all SSO authentication tokens on last working day',
      },
    ];

    await OffboardingTask.insertMany(standardTasks);

    await recordAuditLog({
      organizationId: orgId,
      userId: actorUserId,
      action: 'RESIGNATION_SUBMITTED',
      entity: 'Resignation',
      entityId: resignation._id,
      metadata: { employeeCode: employee.employeeCode, reason: resignation.reasonCategory },
    });

    return resignation;
  }

  /**
   * Retrieves list of resignations based on user privileges and filters
   */
  async getResignations(orgId, filters = {}, user) {
    const isPrivileged =
      user.roles.includes('SUPER_ADMIN') ||
      user.roles.includes('HR_ADMIN') ||
      user.roles.includes('HR_EXECUTIVE') ||
      user.roles.includes('MANAGER');

    const query = { organizationId: orgId };

    // Strict privacy: regular employees can only see their own resignation record
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

    return await Resignation.find(query)
      .populate('employeeId', 'firstName lastName employeeCode workEmail departmentId designationId joiningDate')
      .populate('approverId', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  /**
   * Retrieves single resignation with its clearance checklist tasks
   */
  async getResignationById(orgId, resignationId, user) {
    const resignation = await Resignation.findOne({ _id: resignationId, organizationId: orgId })
      .populate('employeeId', 'firstName lastName employeeCode workEmail departmentId designationId joiningDate')
      .populate('approverId', 'firstName lastName email');

    if (!resignation) {
      const err = new Error('Resignation record not found');
      err.statusCode = 404;
      throw err;
    }

    const isPrivileged =
      user.roles.includes('SUPER_ADMIN') ||
      user.roles.includes('HR_ADMIN') ||
      user.roles.includes('HR_EXECUTIVE') ||
      user.roles.includes('MANAGER');

    // Non-privileged check
    if (!isPrivileged) {
      const emp = await Employee.findOne({ organizationId: orgId, userId: user._id });
      if (!emp || resignation.employeeId._id.toString() !== emp._id.toString()) {
        const err = new Error('Forbidden: You can only view your own exit record');
        err.statusCode = 403;
        throw err;
      }
    }

    const tasks = await OffboardingTask.find({ resignationId: resignation._id })
      .populate('clearedBy', 'firstName lastName')
      .sort({ createdAt: 1 });

    return { resignation, tasks };
  }

  /**
   * Reviews and approves or rejects a resignation
   */
  async reviewResignation(orgId, resignationId, { status, approvedLastWorkingDay, approverNotes }, approverUser) {
    const resignation = await Resignation.findOne({ _id: resignationId, organizationId: orgId });
    if (!resignation) {
      const err = new Error('Resignation record not found');
      err.statusCode = 404;
      throw err;
    }

    if (!['APPROVED', 'REJECTED', 'UNDER_REVIEW'].includes(status)) {
      const err = new Error('Invalid review status');
      err.statusCode = 400;
      throw err;
    }

    resignation.status = status;
    resignation.approverId = approverUser._id;
    resignation.approverNotes = approverNotes || '';
    resignation.approvedAt = new Date();

    if (approvedLastWorkingDay) {
      resignation.approvedLastWorkingDay = new Date(approvedLastWorkingDay);
    }

    // If approved, transition employee status to NOTICE_PERIOD
    if (status === 'APPROVED') {
      await Employee.findByIdAndUpdate(resignation.employeeId, { status: 'NOTICE_PERIOD' });
      resignation.settlementStatus = 'TASKS_IN_PROGRESS';
    } else if (status === 'REJECTED') {
      // Waive pending tasks
      await OffboardingTask.updateMany({ resignationId: resignation._id, status: 'PENDING' }, { status: 'WAIVED' });
    }

    await resignation.save();

    await recordAuditLog({
      organizationId: orgId,
      userId: approverUser._id,
      action: 'RESIGNATION_REVIEWED',
      entity: 'Resignation',
      entityId: resignation._id,
      metadata: { status, approvedLastWorkingDay: resignation.approvedLastWorkingDay },
    });

    return resignation;
  }

  /**
   * Allows employee to withdraw pending resignation before approval
   */
  async withdrawResignation(orgId, resignationId, user) {
    const resignation = await Resignation.findOne({ _id: resignationId, organizationId: orgId });
    if (!resignation) {
      const err = new Error('Resignation record not found');
      err.statusCode = 404;
      throw err;
    }

    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(resignation.status)) {
      const err = new Error(`Cannot withdraw resignation in '${resignation.status}' status`);
      err.statusCode = 400;
      throw err;
    }

    resignation.status = 'WITHDRAWN';
    await resignation.save();

    // Cancel clearance tasks
    await OffboardingTask.updateMany({ resignationId: resignation._id }, { status: 'WAIVED' });

    await recordAuditLog({
      organizationId: orgId,
      userId: user._id,
      action: 'RESIGNATION_WITHDRAWN',
      entity: 'Resignation',
      entityId: resignation._id,
    });

    return resignation;
  }

  /**
   * Updates status and remarks for a clearance checklist task
   */
  async updateClearanceTask(orgId, taskId, { status, remarks }, actorUser) {
    const task = await OffboardingTask.findOne({ _id: taskId, organizationId: orgId });
    if (!task) {
      const err = new Error('Clearance task not found');
      err.statusCode = 404;
      throw err;
    }

    task.status = status;
    if (remarks !== undefined) task.remarks = remarks;

    if (['CLEARED', 'WAIVED'].includes(status)) {
      task.clearedBy = actorUser._id;
      task.clearedAt = new Date();
    } else {
      task.clearedBy = null;
      task.clearedAt = null;
    }

    await task.save();

    // Check if all tasks for this resignation are cleared
    const remainingIncomplete = await OffboardingTask.countDocuments({
      resignationId: task.resignationId,
      status: { $in: ['PENDING', 'IN_PROGRESS'] },
    });

    const resignation = await Resignation.findById(task.resignationId);
    if (resignation && resignation.status === 'APPROVED') {
      if (remainingIncomplete === 0) {
        resignation.settlementStatus = 'CLEARED';
        await resignation.save();
      } else if (resignation.settlementStatus === 'CLEARED') {
        resignation.settlementStatus = 'TASKS_IN_PROGRESS';
        await resignation.save();
      }
    }

    return { task, allTasksCleared: remainingIncomplete === 0 };
  }

  /**
   * Pre-computes full and final settlement elements (leave balance, payable days)
   */
  async calculateSettlement(orgId, resignationId) {
    const resignation = await Resignation.findOne({ _id: resignationId, organizationId: orgId }).populate('employeeId');
    if (!resignation) {
      const err = new Error('Resignation not found');
      err.statusCode = 404;
      throw err;
    }

    const currentYear = new Date().getFullYear();
    const employeeId = resignation.employeeId._id;

    // Fetch latest balance per leave type from ledger
    const ledgers = await LeaveLedger.aggregate([
      { $match: { organizationId: orgId, employeeId, year: currentYear } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$leaveTypeId',
          lastBalance: { $last: '$balanceAfter' },
        },
      },
    ]);

    // Sum encashable leaves (e.g. positive remaining balances)
    let totalEncashableDays = 0;
    ledgers.forEach((l) => {
      if (l.lastBalance > 0) totalEncashableDays += l.lastBalance;
    });

    const proposedLWD = new Date(resignation.proposedLastWorkingDay);
    const approvedLWD = resignation.approvedLastWorkingDay ? new Date(resignation.approvedLastWorkingDay) : proposedLWD;
    const daysServed = Math.max(0, Math.ceil((approvedLWD - new Date(resignation.resignationDate)) / (1000 * 60 * 60 * 24)));
    const shortfall = Math.max(0, (resignation.noticePeriodDays || 30) - daysServed);

    return {
      resignationId: resignation._id,
      employee: {
        id: employeeId,
        name: `${resignation.employeeId.firstName} ${resignation.employeeId.lastName}`,
        code: resignation.employeeId.employeeCode,
      },
      noticePeriodDays: resignation.noticePeriodDays || 30,
      daysServed,
      noticeShortfallDays: shortfall,
      encashableLeaveDays: totalEncashableDays,
      payableDaysInFinalMonth: approvedLWD.getDate(),
      settlementStatus: resignation.settlementStatus,
    };
  }

  /**
   * Finalizes Full & Final Settlement, marks employee TERMINATED, and deactivates login
   */
  async finalizeSettlement(orgId, resignationId, settlementData = {}, actorUser) {
    const resignation = await Resignation.findOne({ _id: resignationId, organizationId: orgId });
    if (!resignation) {
      const err = new Error('Resignation record not found');
      err.statusCode = 404;
      throw err;
    }

    resignation.settlementStatus = 'SETTLED';
    resignation.settlementSummary = {
      noticeShortfallDays: Number(settlementData.noticeShortfallDays) || 0,
      encashableLeaveDays: Number(settlementData.encashableLeaveDays) || 0,
      payableDays: Number(settlementData.payableDays) || 0,
      settlementAmount: Number(settlementData.settlementAmount) || 0,
      settledAt: new Date(),
      remarks: settlementData.remarks || 'Full & final exit settlement processed successfully',
    };

    await resignation.save();

    // Transition employee to TERMINATED status
    const employee = await Employee.findByIdAndUpdate(
      resignation.employeeId,
      { status: 'TERMINATED' },
      { new: true }
    );

    // Revoke user system credentials if linked
    if (employee?.userId) {
      await User.findByIdAndUpdate(employee.userId, { status: 'TERMINATED' });
    }

    await recordAuditLog({
      organizationId: orgId,
      userId: actorUser._id,
      action: 'EXIT_SETTLEMENT_FINALIZED',
      entity: 'Resignation',
      entityId: resignation._id,
      metadata: {
        employeeCode: employee?.employeeCode,
        settlementAmount: resignation.settlementSummary.settlementAmount,
      },
    });

    return {
      message: `Full & final settlement finalized for ${employee?.firstName} ${employee?.lastName}. Access credentials revoked.`,
      resignation,
      employee,
    };
  }
}

export const offboardingService = new OffboardingService();
