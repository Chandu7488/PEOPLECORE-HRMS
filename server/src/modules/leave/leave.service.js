import { LeaveType } from './leaveType.model.js';
import { LeaveLedger } from './leaveLedger.model.js';
import { LeaveRequest } from './leaveRequest.model.js';
import { HolidayCalendar } from '../holidays/holidayCalendar.model.js';
import { Holiday } from '../holidays/holiday.model.js';
import { Employee } from '../employees/employee.model.js';
import { Shift } from '../attendance/shift.model.js';
import { recordAuditLog } from '../audit/audit.model.js';

/**
 * Leave Management Service
 * Implements Section 4.6 (Policies, Double-Entry Ledger, Requests, Approvals, Holiday/Weekend Exclusions)
 */
export class LeaveService {
  /**
   * Initializes standard leave policies (Casual, Sick, Earned, Unpaid) if none exist
   * @param {string|mongoose.Types.ObjectId} orgId
   * @returns {Promise<Array<object>>}
   */
  async seedDefaultLeaveTypes(orgId) {
    const existing = await LeaveType.find({ organizationId: orgId });
    if (existing.length > 0) return existing;

    const defaults = [
      {
        organizationId: orgId,
        code: 'CL',
        name: 'Casual Leave',
        category: 'CASUAL',
        annualQuota: 12,
        accrualFrequency: 'ANNUAL',
        isPaid: true,
        carryForwardLimit: 0,
        description: 'Casual leave for personal or urgent non-medical matters',
      },
      {
        organizationId: orgId,
        code: 'SL',
        name: 'Sick Leave',
        category: 'SICK',
        annualQuota: 10,
        accrualFrequency: 'ANNUAL',
        isPaid: true,
        carryForwardLimit: 5,
        requiresAttachment: true,
        description: 'Medical and health related recovery leave',
      },
      {
        organizationId: orgId,
        code: 'EL',
        name: 'Earned / Annual Leave',
        category: 'EARNED',
        annualQuota: 15,
        accrualFrequency: 'MONTHLY',
        isPaid: true,
        carryForwardLimit: 30,
        minNoticeDays: 3,
        description: 'Earned vacation leave accrued monthly',
      },
      {
        organizationId: orgId,
        code: 'LWP',
        name: 'Leave Without Pay',
        category: 'UNPAID',
        annualQuota: 365,
        accrualFrequency: 'NONE',
        isPaid: false,
        allowNegative: true,
        description: 'Unpaid authorized leave',
      },
    ];

    return await LeaveType.insertMany(defaults);
  }

  /**
   * Retrieves all active leave types for the organization
   */
  async getLeaveTypes(orgId) {
    let types = await LeaveType.find({ organizationId: orgId, isActive: true }).sort({ code: 1 });
    if (types.length === 0) {
      types = await this.seedDefaultLeaveTypes(orgId);
    }
    return types;
  }

  /**
   * Admin creates a new custom leave policy with dynamic quota and rules
   */
  async createLeaveType(orgId, data, userId) {
    const { code, name, annualQuota, isPaid, carryForwardLimit, category, minNoticeDays, description } = data;

    const existing = await LeaveType.findOne({ organizationId: orgId, code: code.toUpperCase() });
    if (existing) {
      const err = new Error(`Leave policy with code "${code.toUpperCase()}" already exists`);
      err.statusCode = 409;
      throw err;
    }

    const leaveType = await LeaveType.create({
      organizationId: orgId,
      code: code.toUpperCase(),
      name,
      annualQuota: Number(annualQuota) || 0,
      isPaid: isPaid !== undefined ? isPaid : true,
      carryForwardLimit: Number(carryForwardLimit) || 0,
      category: category || 'CASUAL',
      minNoticeDays: Number(minNoticeDays) || 0,
      description: description || '',
      isActive: true,
    });

    // Automatically seed initial ledger quota for all active employees for current year
    const activeEmployees = await Employee.find({ organizationId: orgId, status: { $ne: 'TERMINATED' } });
    const currentYear = new Date().getFullYear();

    for (const emp of activeEmployees) {
      if (leaveType.category !== 'UNPAID' && leaveType.annualQuota > 0) {
        await LeaveLedger.create({
          organizationId: orgId,
          employeeId: emp._id,
          leaveTypeId: leaveType._id,
          year: currentYear,
          transactionType: 'OPENING_GRANT',
          amount: leaveType.annualQuota,
          balanceAfter: leaveType.annualQuota,
          notes: `Initial policy quota credit for ${currentYear}`,
          actorId: userId,
        });
      }
    }

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'LEAVE_POLICY_CREATED',
      entity: 'LeaveType',
      entityId: leaveType._id,
      metadata: { code: leaveType.code, quota: leaveType.annualQuota },
    });

    return leaveType;
  }

  /**
   * Admin updates an existing leave policy quota and parameters
   */
  async updateLeaveType(orgId, typeId, data, userId) {
    const leaveType = await LeaveType.findOne({ _id: typeId, organizationId: orgId });
    if (!leaveType) {
      const err = new Error('Leave policy not found');
      err.statusCode = 404;
      throw err;
    }

    const oldQuota = leaveType.annualQuota;
    if (data.name !== undefined) leaveType.name = data.name;
    if (data.annualQuota !== undefined) leaveType.annualQuota = Number(data.annualQuota);
    if (data.isPaid !== undefined) leaveType.isPaid = Boolean(data.isPaid);
    if (data.carryForwardLimit !== undefined) leaveType.carryForwardLimit = Number(data.carryForwardLimit);
    if (data.category !== undefined) leaveType.category = data.category;
    if (data.minNoticeDays !== undefined) leaveType.minNoticeDays = Number(data.minNoticeDays);
    if (data.description !== undefined) leaveType.description = data.description;

    await leaveType.save();

    // If quota changed, adjust active employees' opening balances
    if (data.annualQuota !== undefined && Number(data.annualQuota) !== oldQuota) {
      const diff = Number(data.annualQuota) - oldQuota;
      const currentYear = new Date().getFullYear();
      const activeEmployees = await Employee.find({ organizationId: orgId, status: { $ne: 'TERMINATED' } });

      for (const emp of activeEmployees) {
        const lastLedger = await LeaveLedger.findOne({
          employeeId: emp._id,
          leaveTypeId: leaveType._id,
          year: currentYear,
        }).sort({ createdAt: -1 });

        const prevBalance = lastLedger ? lastLedger.balanceAfter : 0;
        const newBalance = Math.max(0, prevBalance + diff);

        await LeaveLedger.create({
          organizationId: orgId,
          employeeId: emp._id,
          leaveTypeId: leaveType._id,
          year: currentYear,
          transactionType: 'ADMIN_ADJUSTMENT',
          amount: diff,
          balanceAfter: newBalance,
          notes: `Quota revision from ${oldQuota} to ${leaveType.annualQuota} days`,
          actorId: userId,
        });
      }
    }

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'LEAVE_POLICY_UPDATED',
      entity: 'LeaveType',
      entityId: leaveType._id,
      metadata: { code: leaveType.code, oldQuota, newQuota: leaveType.annualQuota },
    });

    return leaveType;
  }

  /**
   * Admin soft-deletes / deactivates a leave policy
   */
  async deleteLeaveType(orgId, typeId, userId) {
    const leaveType = await LeaveType.findOne({ _id: typeId, organizationId: orgId });
    if (!leaveType) {
      const err = new Error('Leave policy not found');
      err.statusCode = 404;
      throw err;
    }

    leaveType.isActive = false;
    await leaveType.save();

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'LEAVE_POLICY_DEACTIVATED',
      entity: 'LeaveType',
      entityId: leaveType._id,
    });

    return { message: `Leave policy ${leaveType.code} deactivated successfully` };
  }

  /**
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} employeeId
   * @param {number} [year=2026]
   * @param {string|null} actorId
   */
  async grantInitialLeaveBalances(orgId, employeeId, year = 2026, actorId = null) {
    const leaveTypes = await this.getLeaveTypes(orgId);

    for (const lt of leaveTypes) {
      if (lt.category === 'UNPAID') continue;

      // Check if opening grant already recorded for this year
      const existing = await LeaveLedger.findOne({
        employeeId,
        leaveTypeId: lt._id,
        year,
        transactionType: 'OPENING_GRANT',
      });

      if (!existing) {
        await LeaveLedger.create({
          organizationId: orgId,
          employeeId,
          leaveTypeId: lt._id,
          year,
          transactionType: 'OPENING_GRANT',
          amount: lt.annualQuota,
          balanceAfter: lt.annualQuota,
          notes: `Annual quota credit for ${year}`,
          actorId,
        });
      }
    }
  }

  /**
   * Calculates live available balance for an employee across all leave types
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} employeeId
   * @param {number} [year=2026]
   */
  async getEmployeeLeaveBalances(orgId, employeeId, year = 2026) {
    // Ensure initial balances exist
    await this.grantInitialLeaveBalances(orgId, employeeId, year);

    const leaveTypes = await this.getLeaveTypes(orgId);
    const balances = [];

    for (const lt of leaveTypes) {
      // Find the most recent ledger row to get authoritative running balance
      const latestLedger = await LeaveLedger.findOne({
        employeeId,
        leaveTypeId: lt._id,
        year,
      }).sort({ createdAt: -1 });

      const currentBalance = latestLedger ? latestLedger.balanceAfter : lt.annualQuota;

      // Calculate pending hold days (requests submitted but not yet decided)
      const pendingRequests = await LeaveRequest.find({
        employeeId,
        leaveTypeId: lt._id,
        status: 'PENDING',
        startDate: { $regex: `^${year}` },
      });

      const pendingDays = pendingRequests.reduce((sum, r) => sum + r.deductedDays, 0);

      balances.push({
        leaveTypeId: lt._id,
        leaveType: lt,
        code: lt.code,
        name: lt.name,
        category: lt.category,
        isPaid: lt.isPaid,
        allocated: lt.annualQuota,
        totalAllocated: lt.annualQuota,
        balance: Math.max(0, currentBalance - pendingDays),
        currentBalance,
        pendingDays,
        availableBalance: Math.max(0, currentBalance - pendingDays),
      });
    }

    return balances;
  }

  /**
   * Helper: Calculates business days by excluding weekly-offs and published holidays
   * Implements Section 4.6: "holiday/week-off handling from the published calendar"
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @param {boolean} isHalfDay
   * @returns {Promise<{ calendarDays: number, deductedDays: number, breakdown: Array<object>, calendarVersion: number }>}
   */
  async calculateLeaveDeduction(orgId, startDate, endDate, isHalfDay = false) {
    if (startDate > endDate) {
      throw { statusCode: 400, code: 'INVALID_DATE_RANGE', message: 'Start date cannot be after end date' };
    }

    const startYear = parseInt(startDate.slice(0, 4), 10);

    // Fetch published company holiday calendar for this year
    const publishedCal = await HolidayCalendar.findOne({
      organizationId: orgId,
      year: startYear,
      status: 'PUBLISHED',
    });

    const holidayMap = new Map();
    if (publishedCal) {
      const holidays = await Holiday.find({ calendarId: publishedCal._id, isActive: true });
      for (const h of holidays) {
        holidayMap.set(h.localDate, h.name);
      }
    }

    // Fetch organization shift to determine dynamic work days (5-day vs 6-day vs custom)
    const shift = await Shift.findOne({ organizationId: orgId, isDefault: true, isActive: true });
    const configuredWorkDays = shift && shift.workDays && shift.workDays.length > 0
      ? shift.workDays
      : ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    const breakdown = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    let chargedDays = 0;
    let totalCalendarDays = 0;

    while (current <= end) {
      totalCalendarDays++;
      const dateStr = current.toISOString().slice(0, 10);
      const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday
      const dayName = dayNames[dayOfWeek];

      const isWeeklyOff = !configuredWorkDays.includes(dayName);

      if (isWeeklyOff) {
        // Dynamic Weekly-Off based on Shift / Schedule (5-day, 6-day, etc.)
        breakdown.push({ date: dateStr, status: 'WEEKLY_OFF', holidayName: null });
      } else if (holidayMap.has(dateStr)) {
        // Official Company Holiday from Published Calendar!
        breakdown.push({
          date: dateStr,
          status: 'COMPANY_HOLIDAY',
          holidayName: holidayMap.get(dateStr),
        });
      } else {
        // Business working day to be deducted
        breakdown.push({ date: dateStr, status: 'CHARGED', holidayName: null });
        chargedDays++;
      }

      current.setDate(current.getDate() + 1);
    }

    let deductedDays = chargedDays;
    if (isHalfDay && deductedDays > 0) {
      deductedDays = 0.5;
    }

    return {
      calendarDays: isHalfDay ? 0.5 : totalCalendarDays,
      deductedDays,
      breakdown,
      calendarVersion: publishedCal ? publishedCal.version : 1,
    };
  }

  /**
   * Applies for leave with overlap validation, holiday exclusion, and balance hold
   */
  async applyLeave(orgId, employeeId, requestData) {
    const { leaveTypeId, startDate, endDate, isHalfDay, halfDaySession, reason } = requestData;

    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType) {
      throw { statusCode: 404, code: 'LEAVE_TYPE_NOT_FOUND', message: 'Leave type not found' };
    }

    // 1. Check for overlapping existing active leave requests
    const overlap = await LeaveRequest.findOne({
      employeeId,
      status: { $in: ['PENDING', 'APPROVED'] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    });

    if (overlap) {
      throw {
        statusCode: 409,
        code: 'OVERLAPPING_REQUEST',
        message: `You already have an existing leave request from ${overlap.startDate} to ${overlap.endDate} (${overlap.status})`,
      };
    }

    // 2. Calculate deductions using published holiday calendar
    const { calendarDays, deductedDays, breakdown, calendarVersion } =
      await this.calculateLeaveDeduction(orgId, startDate, endDate, !!isHalfDay);

    if (deductedDays <= 0) {
      throw {
        statusCode: 400,
        code: 'ZERO_DEDUCTION',
        message: 'The selected date range consists only of weekends and official company holidays. No leave deduction is required.',
      };
    }

    // 3. Balance availability check
    const year = parseInt(startDate.slice(0, 4), 10);
    const balances = await this.getEmployeeLeaveBalances(orgId, employeeId, year);
    const currentBalanceObj = balances.find((b) => b.leaveType._id.toString() === leaveTypeId.toString());

    if (!leaveType.allowNegative && currentBalanceObj && currentBalanceObj.availableBalance < deductedDays) {
      throw {
        statusCode: 400,
        code: 'INSUFFICIENT_BALANCE',
        message: `Insufficient leave balance for ${leaveType.name}. Available: ${currentBalanceObj.availableBalance} days, Required: ${deductedDays} days`,
      };
    }

    // 4. Create LeaveRequest record
    const leaveRequest = await LeaveRequest.create({
      organizationId: orgId,
      employeeId,
      leaveTypeId,
      startDate,
      endDate,
      isHalfDay: !!isHalfDay,
      halfDaySession: isHalfDay ? halfDaySession || 'FIRST_HALF' : null,
      calendarDays,
      deductedDays,
      breakdown,
      reason,
      status: 'PENDING',
      holidayCalendarVersion: calendarVersion,
    });

    return await LeaveRequest.findById(leaveRequest._id)
      .populate('leaveTypeId', 'name code isPaid')
      .populate('employeeId', 'firstName lastName code workEmail');
  }

  /**
   * Approves a leave request and posts an immutable DEBIT transaction to LeaveLedger
   */
  async approveLeave(requestId, approverEmployeeId, notes = '') {
    const request = await LeaveRequest.findById(requestId)
      .populate('leaveTypeId')
      .populate('employeeId');

    if (!request) {
      throw { statusCode: 404, code: 'REQUEST_NOT_FOUND', message: 'Leave request not found' };
    }

    if (request.status !== 'PENDING') {
      throw { statusCode: 400, code: 'INVALID_STATUS', message: `Cannot approve request with status ${request.status}` };
    }

    const year = parseInt(request.startDate.slice(0, 4), 10);

    // Get current balance
    const latestLedger = await LeaveLedger.findOne({
      employeeId: request.employeeId._id,
      leaveTypeId: request.leaveTypeId._id,
      year,
    }).sort({ createdAt: -1 });

    const previousBalance = latestLedger ? latestLedger.balanceAfter : request.leaveTypeId.annualQuota;
    const newBalance = previousBalance - request.deductedDays;

    // Post double-entry DEBIT transaction
    await LeaveLedger.create({
      organizationId: request.organizationId,
      employeeId: request.employeeId._id,
      leaveTypeId: request.leaveTypeId._id,
      year,
      transactionType: 'REQUEST_DEBIT',
      amount: -request.deductedDays,
      balanceAfter: newBalance,
      leaveRequestId: request._id,
      notes: `Approved leave from ${request.startDate} to ${request.endDate}`,
      actorId: approverEmployeeId,
    });

    request.status = 'APPROVED';
    request.approverId = approverEmployeeId;
    request.decisionAt = new Date();
    request.decisionNotes = notes;
    await request.save();

    await recordAuditLog({
      action: 'LEAVE_REQUEST_APPROVED',
      actorId: approverEmployeeId,
      targetId: request._id.toString(),
      metadata: { employeeId: request.employeeId._id, deductedDays: request.deductedDays },
    });

    return request;
  }

  /**
   * Rejects a leave request (releases hold, no ledger deduction)
   */
  async rejectLeave(requestId, approverEmployeeId, rejectionReason = '') {
    const request = await LeaveRequest.findById(requestId);
    if (!request) {
      throw { statusCode: 404, code: 'REQUEST_NOT_FOUND', message: 'Leave request not found' };
    }

    if (request.status !== 'PENDING') {
      throw { statusCode: 400, code: 'INVALID_STATUS', message: `Cannot reject request with status ${request.status}` };
    }

    request.status = 'REJECTED';
    request.approverId = approverEmployeeId;
    request.decisionAt = new Date();
    request.decisionNotes = rejectionReason || 'Request rejected by manager/HR';
    await request.save();

    await recordAuditLog({
      action: 'LEAVE_REQUEST_REJECTED',
      actorId: approverEmployeeId,
      targetId: request._id.toString(),
      metadata: { reason: rejectionReason },
    });

    return request;
  }

  /**
   * Cancels an approved leave request and posts an immutable CREDIT REVERSAL transaction
   */
  async cancelLeave(requestId, employeeId, actorUserId = null) {
    const request = await LeaveRequest.findById(requestId);
    if (!request) {
      throw { statusCode: 404, code: 'REQUEST_NOT_FOUND', message: 'Leave request not found' };
    }

    const wasApproved = request.status === 'APPROVED';
    request.status = 'CANCELLED';
    await request.save();

    // If it was already approved and debited, reverse the deduction in the ledger!
    if (wasApproved) {
      const year = parseInt(request.startDate.slice(0, 4), 10);
      const latestLedger = await LeaveLedger.findOne({
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        year,
      }).sort({ createdAt: -1 });

      const prevBal = latestLedger ? latestLedger.balanceAfter : 0;
      const reversedBal = prevBal + request.deductedDays;

      await LeaveLedger.create({
        organizationId: request.organizationId,
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        year,
        transactionType: 'REQUEST_CANCEL_CREDIT',
        amount: request.deductedDays,
        balanceAfter: reversedBal,
        leaveRequestId: request._id,
        notes: `Reversal of cancelled leave from ${request.startDate} to ${request.endDate}`,
        actorId: actorUserId,
      });
    }

    return request;
  }

  /**
   * Retrieves leave requests for an employee
   */
  async getEmployeeLeaveRequests(employeeId) {
    return await LeaveRequest.find({ employeeId })
      .populate('leaveTypeId', 'name code isPaid category')
      .populate('approverId', 'firstName lastName')
      .sort({ createdAt: -1 });
  }

  /**
   * Retrieves team leave requests pending approval
   */
  async getTeamLeaveRequests(orgId, approverEmployeeId = null) {
    const query = { organizationId: orgId };
    if (approverEmployeeId) {
      // Find direct report employees
      const directReports = await Employee.find({ managerId: approverEmployeeId }).select('_id');
      const reportIds = directReports.map((r) => r._id);
      query.employeeId = { $in: reportIds };
    }

    return await LeaveRequest.find(query)
      .populate('leaveTypeId', 'name code isPaid')
      .populate('employeeId', 'firstName lastName code workEmail')
      .sort({ createdAt: -1 });
  }
}

export const leaveService = new LeaveService();
