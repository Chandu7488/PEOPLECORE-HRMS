import { Shift } from './shift.model.js';
import { AttendancePunch } from './punch.model.js';
import { AttendanceDay } from './attendanceDay.model.js';
import { AttendanceRegularization } from './regularization.model.js';
import { HolidayCalendar } from '../holidays/holidayCalendar.model.js';
import { Holiday } from '../holidays/holiday.model.js';
import { LeaveRequest } from '../leave/leaveRequest.model.js';
import { Employee } from '../employees/employee.model.js';
import { recordAuditLog } from '../audit/audit.model.js';

/**
 * Attendance & Punch Service
 * Implements Section 4.5 & 4.7 (Shifts, Idempotent Raw Punches, Daily Derived Summaries, Regularization)
 */
export class AttendanceService {
  /**
   * Seeds or retrieves the active default shift without duplicate key errors
   */
  async seedDefaultShift(orgId) {
    let shift = await Shift.findOne({ organizationId: orgId, isDefault: true, isActive: true });
    if (shift) return shift;

    // Check if GEN-01 exists or any active shift exists in this org
    shift = await Shift.findOne({ organizationId: orgId, code: 'GEN-01' });
    if (shift) {
      shift.isDefault = true;
      shift.isActive = true;
      await shift.save();
      return shift;
    }

    shift = await Shift.findOne({ organizationId: orgId, isActive: true });
    if (shift) {
      shift.isDefault = true;
      await shift.save();
      return shift;
    }

    shift = await Shift.create({
      organizationId: orgId,
      code: 'GEN-01',
      name: 'General Shift (9 AM - 6 PM)',
      startTime: '09:00',
      endTime: '18:00',
      graceMinutes: 15,
      halfDayMinutes: 240,
      fullDayMinutes: 480,
      breakMinutes: 60,
      workDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      isDefault: true,
      isActive: true,
    });
    return shift;
  }

  /**
   * Retrieves all shifts for organization
   */
  async getShifts(orgId) {
    let shifts = await Shift.find({ organizationId: orgId, isActive: true }).sort({ isDefault: -1, code: 1 });
    if (shifts.length === 0) {
      const defaultShift = await this.seedDefaultShift(orgId);
      shifts = [defaultShift];
    }
    return shifts;
  }

  /**
   * Admin creates a new custom Shift / Work Schedule
   */
  async createShift(orgId, data, userId) {
    const {
      code,
      name,
      startTime,
      endTime,
      graceMinutes,
      halfDayMinutes,
      fullDayMinutes,
      breakMinutes,
      workDays,
      workMode,
      isDefault,
    } = data;

    const existing = await Shift.findOne({ organizationId: orgId, code: code.toUpperCase() });
    if (existing) {
      const err = new Error(`Shift with code "${code.toUpperCase()}" already exists`);
      err.statusCode = 409;
      throw err;
    }

    if (isDefault) {
      await Shift.updateMany({ organizationId: orgId }, { isDefault: false });
    }

    const shift = await Shift.create({
      organizationId: orgId,
      code: code.toUpperCase(),
      name,
      startTime: startTime || '09:00',
      endTime: endTime || '18:00',
      graceMinutes: Number(graceMinutes) || 15,
      halfDayMinutes: Number(halfDayMinutes) || 240,
      fullDayMinutes: Number(fullDayMinutes) || 480,
      breakMinutes: Number(breakMinutes) || 60,
      workDays: workDays && workDays.length > 0 ? workDays : ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      workMode: workMode || 'OFFICE',
      isDefault: Boolean(isDefault),
      isActive: true,
    });

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'SHIFT_CREATED',
      entity: 'Shift',
      entityId: shift._id,
      metadata: { code: shift.code, timing: `${shift.startTime}-${shift.endTime}`, workDays: shift.workDays },
    });

    return shift;
  }

  /**
   * Admin updates an existing Shift / Work Schedule
   */
  async updateShift(orgId, shiftId, data, userId) {
    const shift = await Shift.findOne({ _id: shiftId, organizationId: orgId });
    if (!shift) {
      const err = new Error('Shift not found');
      err.statusCode = 404;
      throw err;
    }

    if (data.name !== undefined) shift.name = data.name;
    if (data.startTime !== undefined) shift.startTime = data.startTime;
    if (data.endTime !== undefined) shift.endTime = data.endTime;
    if (data.graceMinutes !== undefined) shift.graceMinutes = Number(data.graceMinutes);
    if (data.halfDayMinutes !== undefined) shift.halfDayMinutes = Number(data.halfDayMinutes);
    if (data.fullDayMinutes !== undefined) shift.fullDayMinutes = Number(data.fullDayMinutes);
    if (data.breakMinutes !== undefined) shift.breakMinutes = Number(data.breakMinutes);
    if (data.workDays !== undefined && Array.isArray(data.workDays)) shift.workDays = data.workDays;
    if (data.workMode !== undefined) shift.workMode = data.workMode;

    if (data.isDefault) {
      await Shift.updateMany({ organizationId: orgId }, { isDefault: false });
      shift.isDefault = true;
    }

    await shift.save();

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'SHIFT_UPDATED',
      entity: 'Shift',
      entityId: shift._id,
      metadata: { code: shift.code, timing: `${shift.startTime}-${shift.endTime}`, workDays: shift.workDays },
    });

    return shift;
  }

  /**
   * Admin sets a shift as company default
   */
  async setDefaultShift(orgId, shiftId, userId) {
    const shift = await Shift.findOne({ _id: shiftId, organizationId: orgId });
    if (!shift) {
      const err = new Error('Shift not found');
      err.statusCode = 404;
      throw err;
    }

    await Shift.updateMany({ organizationId: orgId }, { isDefault: false });
    shift.isDefault = true;
    await shift.save();

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'SHIFT_SET_DEFAULT',
      entity: 'Shift',
      entityId: shift._id,
    });

    return shift;
  }

  /**
   * Admin deactivates / deletes a custom shift
   */
  async deleteShift(orgId, shiftId, userId) {
    const shift = await Shift.findOne({ _id: shiftId, organizationId: orgId });
    if (!shift) {
      const err = new Error('Shift not found');
      err.statusCode = 404;
      throw err;
    }

    if (shift.isDefault) {
      const err = new Error('Cannot delete the organization default shift. Please designate another default shift first.');
      err.statusCode = 400;
      throw err;
    }

    shift.isActive = false;
    await shift.save();

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'SHIFT_DEACTIVATED',
      entity: 'Shift',
      entityId: shift._id,
    });

    return { message: `Shift ${shift.name} (${shift.code}) deactivated successfully` };
  }

  /**
   * Records a raw punch (IN or OUT) idempotently and triggers daily attendance calculation
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} employeeId
   * @param {{ type: 'IN'|'OUT', source?: string, ipAddress?: string, location?: string, idempotencyKey?: string }} punchData
   */
  async recordPunch(orgId, employeeId, punchData) {
    const now = new Date();
    const localDate = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // 1. Idempotency Check
    if (punchData.idempotencyKey) {
      const existing = await AttendancePunch.findOne({ idempotencyKey: punchData.idempotencyKey });
      if (existing) {
        return { punch: existing, summary: await this.getTodaySummary(orgId, employeeId) };
      }
    }

    // 2. Save raw punch event
    const punch = await AttendancePunch.create({
      organizationId: orgId,
      employeeId,
      punchTime: now,
      localDate,
      type: punchData.type,
      source: punchData.source || 'WEB',
      ipAddress: punchData.ipAddress || '',
      location: punchData.location || '',
      idempotencyKey: punchData.idempotencyKey || null,
    });

    // 3. Recalculate daily attendance summary idempotently
    const summary = await this.calculateDailyAttendance(orgId, employeeId, localDate);

    return { punch, summary };
  }

  /**
   * Idempotent Daily Attendance Derivation
   * Consumes raw punches, shift rules, approved leaves, and published company holidays per Section 4.5
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} employeeId
   * @param {string} dateStr - YYYY-MM-DD
   */
  async calculateDailyAttendance(orgId, employeeId, dateStr) {
    const shift = await this.seedDefaultShift(orgId);
    const dateObj = new Date(dateStr);
    const year = parseInt(dateStr.slice(0, 4), 10);
    const dayOfWeek = dateObj.getDay(); // 0 is Sun, 6 is Sat

    // 1. Check if date is a Published Company Holiday
    const publishedCal = await HolidayCalendar.findOne({
      organizationId: orgId,
      year,
      status: 'PUBLISHED',
    });

    let holidayName = null;
    if (publishedCal) {
      const holiday = await Holiday.findOne({ calendarId: publishedCal._id, localDate: dateStr, isActive: true });
      if (holiday) {
        holidayName = holiday.name;
      }
    }

    // 2. Check if date is an Approved Leave
    const approvedLeave = await LeaveRequest.findOne({
      employeeId,
      status: 'APPROVED',
      startDate: { $lte: dateStr },
      endDate: { $gte: dateStr },
    }).populate('leaveTypeId', 'name code isPaid');

    // 3. Fetch all raw punches for this day
    const punches = await AttendancePunch.find({ employeeId, localDate: dateStr }).sort({ punchTime: 1 });

    let firstIn = null;
    let lastOut = null;
    let totalWorkMinutes = 0;
    let status = 'ABSENT';
    let isLate = false;
    let lateMinutes = 0;

    if (punches.length > 0) {
      const inPunches = punches.filter((p) => p.type === 'IN');
      const outPunches = punches.filter((p) => p.type === 'OUT');

      if (inPunches.length > 0) firstIn = inPunches[0].punchTime;
      if (outPunches.length > 0) lastOut = outPunches[outPunches.length - 1].punchTime;

      if (firstIn && lastOut && lastOut > firstIn) {
        const diffMs = lastOut - firstIn;
        totalWorkMinutes = Math.floor(diffMs / (1000 * 60));
      }

      // Check Late Arrival against shift start time + grace period
      if (firstIn) {
        const inHours = firstIn.getHours();
        const inMins = firstIn.getMinutes();
        const [shiftStartH, shiftStartM] = shift.startTime.split(':').map(Number);
        const shiftStartTotalMins = shiftStartH * 60 + shiftStartM;
        const actualInTotalMins = inHours * 60 + inMins;

        if (actualInTotalMins > shiftStartTotalMins + shift.graceMinutes) {
          isLate = true;
          lateMinutes = actualInTotalMins - shiftStartTotalMins;
        }
      }

      // Determine Present vs Half-Day vs Late
      if (totalWorkMinutes >= shift.fullDayMinutes) {
        status = isLate ? 'LATE' : 'PRESENT';
      } else if (totalWorkMinutes >= shift.halfDayMinutes) {
        status = 'HALF_DAY';
      } else if (inPunches.length > 0 && outPunches.length === 0) {
        status = 'MISSED_PUNCH'; // Clocked in but never clocked out
      } else {
        status = 'HALF_DAY';
      }
    } else {
      // No punches recorded: determine non-working day, holiday, or absence
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const dayName = dayNames[dayOfWeek];
      const isWeeklyOff = shift.workDays && shift.workDays.length > 0
        ? !shift.workDays.includes(dayName)
        : (dayOfWeek === 0 || dayOfWeek === 6);

      if (holidayName) {
        status = 'HOLIDAY';
      } else if (approvedLeave) {
        status = 'LEAVE';
      } else if (isWeeklyOff) {
        status = 'WEEKLY_OFF';
      } else {
        status = 'ABSENT';
      }
    }

    // Upsert derived daily summary
    const summary = await AttendanceDay.findOneAndUpdate(
      { organizationId: orgId, employeeId, date: dateStr },
      {
        shiftId: shift._id,
        firstIn,
        lastOut,
        totalWorkMinutes,
        status,
        isLate,
        lateMinutes,
        holidayName,
        leaveRequestId: approvedLeave ? approvedLeave._id : null,
        holidayCalendarVersion: publishedCal ? publishedCal.version : 1,
        $inc: { calculationVersion: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return summary;
  }

  /**
   * Retrieves today's attendance summary and last punch for an employee
   */
  async getTodaySummary(orgId, employeeId) {
    const todayStr = new Date().toISOString().slice(0, 10);
    let summary = await AttendanceDay.findOne({ employeeId, date: todayStr }).populate('shiftId');

    if (!summary) {
      summary = await this.calculateDailyAttendance(orgId, employeeId, todayStr);
    }

    // Always fetch latest authoritative organization shift
    const activeShift = await Shift.findOne({ organizationId: orgId, isDefault: true, isActive: true })
      || await Shift.findOne({ organizationId: orgId, isActive: true })
      || (summary && summary.shiftId ? summary.shiftId : null);

    const lastPunch = await AttendancePunch.findOne({ employeeId, localDate: todayStr }).sort({ punchTime: -1 });

    return {
      attendance: summary,
      summary,
      shift: activeShift,
      lastPunch,
      isClockedIn: lastPunch ? lastPunch.type === 'IN' : false,
    };
  }

  /**
   * Retrieves monthly attendance timesheet for an employee
   * @param {string|mongoose.Types.ObjectId} employeeId
   * @param {number} year
   * @param {number} month - 1-indexed (1 to 12)
   */
  async getMonthlyTimesheet(employeeId, year, month) {
    const monthStr = month.toString().padStart(2, '0');
    const regex = new RegExp(`^${year}-${monthStr}`);

    const days = await AttendanceDay.find({
      employeeId,
      date: { $regex: regex },
    })
      .populate('shiftId', 'name startTime endTime')
      .sort({ date: 1 });

    // Summary statistics
    const stats = {
      present: days.filter((d) => d.status === 'PRESENT' || d.status === 'LATE').length,
      late: days.filter((d) => d.isLate).length,
      halfDay: days.filter((d) => d.status === 'HALF_DAY').length,
      absent: days.filter((d) => d.status === 'ABSENT').length,
      leave: days.filter((d) => d.status === 'LEAVE').length,
      holiday: days.filter((d) => d.status === 'HOLIDAY').length,
      weeklyOff: days.filter((d) => d.status === 'WEEKLY_OFF').length,
      totalWorkMinutes: days.reduce((sum, d) => sum + d.totalWorkMinutes, 0),
    };

    return { days, stats };
  }

  /**
   * Submits a regularization request to correct missed punches or late status
   */
  async submitRegularization(orgId, employeeId, data) {
    const { date, requestedCheckIn, requestedCheckOut, reason } = data;

    let attendanceDay = await AttendanceDay.findOne({ employeeId, date });
    if (!attendanceDay) {
      attendanceDay = await this.calculateDailyAttendance(orgId, employeeId, date);
    }

    const regularization = await AttendanceRegularization.create({
      organizationId: orgId,
      employeeId,
      attendanceDayId: attendanceDay._id,
      date,
      requestedCheckIn,
      requestedCheckOut,
      reason,
      status: 'PENDING',
    });

    return regularization;
  }

  /**
   * Approves a regularization request and updates the AttendanceDay record
   */
  async approveRegularization(regularizationId, approverEmployeeId) {
    const reg = await AttendanceRegularization.findById(regularizationId);
    if (!reg) {
      throw { statusCode: 404, code: 'REGULARIZATION_NOT_FOUND', message: 'Regularization request not found' };
    }

    reg.status = 'APPROVED';
    reg.approverId = approverEmployeeId;
    reg.decisionAt = new Date();
    await reg.save();

    // Update the daily attendance record to REGULARIZED
    await AttendanceDay.findByIdAndUpdate(reg.attendanceDayId, {
      status: 'REGULARIZED',
      isLate: false,
    });

    return reg;
  }
}

export const attendanceService = new AttendanceService();
