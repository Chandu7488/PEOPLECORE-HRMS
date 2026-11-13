import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Organization } from '../src/modules/organization/organization.model.js';
import { User } from '../src/modules/users/user.model.js';
import { Employee } from '../src/modules/employees/employee.model.js';
import { HolidayCalendar } from '../src/modules/holidays/holidayCalendar.model.js';
import { Holiday } from '../src/modules/holidays/holiday.model.js';
import { LeaveType } from '../src/modules/leave/leaveType.model.js';
import { LeaveLedger } from '../src/modules/leave/leaveLedger.model.js';
import { LeaveRequest } from '../src/modules/leave/leaveRequest.model.js';
import { leaveService } from '../src/modules/leave/leave.service.js';
import { attendanceService } from '../src/modules/attendance/attendance.service.js';
import { Shift } from '../src/modules/attendance/shift.model.js';
import { AttendancePunch } from '../src/modules/attendance/punch.model.js';
import { AttendanceDay } from '../src/modules/attendance/attendanceDay.model.js';

describe('Phase 4: Leave & Attendance Engine Self-Tests', () => {
  let org;
  let testEmp;
  let hrAdmin;
  let clType;
  let publishedCalendar;

  before(async () => {
    await connectDB();
    org = await Organization.findOne();
    testEmp = await Employee.findOne({ workEmail: 'employee@peoplecore.local' });
    hrAdmin = await Employee.findOne({ workEmail: 'hr@peoplecore.local' });

    // Ensure published calendar for 2026 exists with Republic Day holiday
    publishedCalendar = await HolidayCalendar.findOne({ organizationId: org._id, year: 2026, status: 'PUBLISHED' });
    if (!publishedCalendar) {
      publishedCalendar = await HolidayCalendar.create({
        organizationId: org._id,
        name: 'Company Holiday Calendar 2026',
        year: 2026,
        status: 'PUBLISHED',
        version: 1,
      });
      await Holiday.create({
        calendarId: publishedCalendar._id,
        localDate: '2026-01-26', // Monday
        name: 'Republic Day',
        type: 'NATIONAL',
      });
    }

    // Seed leave types & initial balances
    await leaveService.seedDefaultLeaveTypes(org._id);
    clType = await LeaveType.findOne({ organizationId: org._id, code: 'CL' });
    await leaveService.grantInitialLeaveBalances(org._id, testEmp._id, 2026);
  });

  after(async () => {
    await disconnectDB();
  });

  test('1. Double-entry ledger records opening annual quota for employee', async () => {
    const openingLedger = await LeaveLedger.findOne({
      employeeId: testEmp._id,
      leaveTypeId: clType._id,
      year: 2026,
      transactionType: 'OPENING_GRANT',
    });

    assert.ok(openingLedger, 'Opening grant should be recorded in LeaveLedger');
    assert.equal(openingLedger.amount, clType.annualQuota);
    assert.equal(openingLedger.balanceAfter, clType.annualQuota);

    const balances = await leaveService.getEmployeeLeaveBalances(org._id, testEmp._id, 2026);
    const clBalance = balances.find((b) => b.leaveType.code === 'CL');
    assert.ok(clBalance);
    assert.equal(clBalance.currentBalance, 12);
    assert.equal(clBalance.availableBalance, 12);
  });

  test('2. Holiday & Weekend exclusion deducts ONLY business days', async () => {
    // Range from Friday 2026-01-23 to Tuesday 2026-01-27 (5 calendar days)
    // Jan 24 (Sat) = Weekend, Jan 25 (Sun) = Weekend, Jan 26 (Mon) = Republic Day Holiday!
    // Net charged days should be ONLY 2 days (Jan 23 Friday and Jan 27 Tuesday)!
    const deduction = await leaveService.calculateLeaveDeduction(org._id, '2026-01-23', '2026-01-27');

    assert.equal(deduction.calendarDays, 5, 'Total calendar days should be 5');
    assert.equal(deduction.deductedDays, 2, 'Deducted business days should be exactly 2');

    const holidayEntry = deduction.breakdown.find((b) => b.date === '2026-01-26');
    assert.ok(holidayEntry, 'Republic day should be in breakdown');
    assert.equal(holidayEntry.status, 'COMPANY_HOLIDAY');

    const satEntry = deduction.breakdown.find((b) => b.date === '2026-01-24');
    assert.equal(satEntry.status, 'WEEKLY_OFF');
  });

  test('3. Leave application performs overlap checks and holds balance', async () => {
    // Apply leave for 2 days
    const req = await leaveService.applyLeave(org._id, testEmp._id, {
      leaveTypeId: clType._id,
      startDate: '2026-02-10',
      endDate: '2026-02-11',
      reason: 'Personal urgent work',
    });

    assert.equal(req.status, 'PENDING');
    assert.equal(req.deductedDays, 2);

    // Overlapping request on same dates should be rejected with 409
    await assert.rejects(
      async () => {
        await leaveService.applyLeave(org._id, testEmp._id, {
          leaveTypeId: clType._id,
          startDate: '2026-02-11',
          endDate: '2026-02-12',
          reason: 'Duplicate overlap test',
        });
      },
      (err) => err.code === 'OVERLAPPING_REQUEST'
    );

    // Check available balance is now 12 - 2 = 10
    const balances = await leaveService.getEmployeeLeaveBalances(org._id, testEmp._id, 2026);
    const clBalance = balances.find((b) => b.leaveType.code === 'CL');
    assert.equal(clBalance.availableBalance, 10);

    // Clean up test request
    await LeaveRequest.findByIdAndDelete(req._id);
  });

  test('4. Approving leave creates immutable REQUEST_DEBIT in LeaveLedger', async () => {
    const req = await leaveService.applyLeave(org._id, testEmp._id, {
      leaveTypeId: clType._id,
      startDate: '2026-03-10',
      endDate: '2026-03-10', // 1 day
      reason: 'Family function',
    });

    const approved = await leaveService.approveLeave(req._id, hrAdmin._id, 'Approved by HR');
    assert.equal(approved.status, 'APPROVED');

    const debitLedger = await LeaveLedger.findOne({
      leaveRequestId: req._id,
      transactionType: 'REQUEST_DEBIT',
    });

    assert.ok(debitLedger, 'REQUEST_DEBIT ledger row must be recorded');
    assert.equal(debitLedger.amount, -1);
    assert.equal(debitLedger.balanceAfter, 11);

    // Clean up
    await LeaveLedger.findByIdAndDelete(debitLedger._id);
    await LeaveRequest.findByIdAndDelete(req._id);
  });

  test('5. Idempotent raw punches record check-in and check-out and derive AttendanceDay', async () => {
    const shift = await attendanceService.seedDefaultShift(org._id);
    assert.ok(shift, 'Default general shift must exist');

    const punchInKey = `punch-in-test-${Date.now()}`;
    const punchIn = await attendanceService.recordPunch(org._id, testEmp._id, {
      type: 'IN',
      source: 'WEB',
      location: 'Bengaluru HQ',
      idempotencyKey: punchInKey,
    });

    assert.ok(punchIn.punch);
    assert.equal(punchIn.punch.type, 'IN');

    // Duplicate punch with same idempotencyKey should return existing without double-counting
    const dupPunch = await attendanceService.recordPunch(org._id, testEmp._id, {
      type: 'IN',
      source: 'WEB',
      idempotencyKey: punchInKey,
    });
    assert.equal(dupPunch.punch._id.toString(), punchIn.punch._id.toString());

    // Record OUT punch
    const punchOut = await attendanceService.recordPunch(org._id, testEmp._id, {
      type: 'OUT',
      source: 'WEB',
    });

    assert.ok(punchOut.summary);
    assert.ok(punchOut.summary.firstIn);
    assert.ok(punchOut.summary.lastOut);

    // Clean up punches
    await AttendancePunch.deleteMany({ employeeId: testEmp._id });
    await AttendanceDay.deleteMany({ employeeId: testEmp._id });
  });

  test('6. Non-working day with published holiday correctly marks HOLIDAY status', async () => {
    // 2026-01-26 is published Republic Day
    const holidayDay = await attendanceService.calculateDailyAttendance(org._id, testEmp._id, '2026-01-26');
    assert.equal(holidayDay.status, 'HOLIDAY');
    assert.equal(holidayDay.holidayName, 'Republic Day');

    // Clean up
    await AttendanceDay.findByIdAndDelete(holidayDay._id);
  });

  test('7. Admin dynamically creates custom leave policy with user-typed quota (no hardcoding)', async () => {
    // Admin creates custom Maternity Leave with 180 days quota
    const customLeave = await leaveService.createLeaveType(
      org._id,
      {
        code: 'MAT_180',
        name: 'Maternity Leave',
        annualQuota: 180,
        isPaid: true,
        category: 'MATERNITY',
        description: 'Statutory 26-week maternity benefit',
      },
      hrAdmin._id
    );

    assert.ok(customLeave);
    assert.equal(customLeave.code, 'MAT_180');
    assert.equal(customLeave.annualQuota, 180);

    // Update quota dynamically (e.g. adjust to 182 days)
    const updated = await leaveService.updateLeaveType(
      org._id,
      customLeave._id,
      { annualQuota: 182, name: 'Maternity Leave (26 Weeks)' },
      hrAdmin._id
    );
    assert.equal(updated.annualQuota, 182);

    // Clean up
    await LeaveType.findByIdAndDelete(customLeave._id);
  });

  test('8. Admin dynamically configures 6-day work schedule and custom office timing (no hardcoding)', async () => {
    // Admin creates a 6-day work week shift (Mon - Sat, 09:30 - 18:30, Hybrid)
    const sixDayShift = await attendanceService.createShift(
      org._id,
      {
        code: 'SHIFT_6D_HYB',
        name: 'Tech 6-Day Hybrid Schedule',
        startTime: '09:30',
        endTime: '18:30',
        graceMinutes: 20,
        workDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
        workMode: 'HYBRID',
        isDefault: true,
      },
      hrAdmin._id
    );

    assert.ok(sixDayShift);
    assert.equal(sixDayShift.startTime, '09:30');
    assert.equal(sixDayShift.workMode, 'HYBRID');
    assert.equal(sixDayShift.workDays.length, 6);
    assert.ok(sixDayShift.workDays.includes('SATURDAY'));

    // Check leave calculation for Saturday: Saturday is now a CHARGED working day rather than WEEKLY_OFF!
    // 2026-01-31 is Saturday
    const deduction = await leaveService.calculateLeaveDeduction(org._id, '2026-01-31', '2026-01-31', false);
    const satItem = deduction.breakdown.find((b) => b.date === '2026-01-31');
    assert.ok(satItem);
    assert.equal(satItem.status, 'CHARGED', 'Saturday must be charged because shift is configured as 6-day working week');

    // Clean up: restore default 5-day shift
    await Shift.findByIdAndDelete(sixDayShift._id);
    const defShift = await Shift.findOne({ organizationId: org._id, code: 'GEN-01' });
    if (defShift) {
      defShift.isDefault = true;
      await defShift.save();
    }
  });
});
