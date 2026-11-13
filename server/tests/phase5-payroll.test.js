import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Organization } from '../src/modules/organization/organization.model.js';
import { User } from '../src/modules/users/user.model.js';
import { Employee } from '../src/modules/employees/employee.model.js';
import { SalaryStructure } from '../src/modules/payroll/salaryStructure.model.js';
import { EmployeeSalary } from '../src/modules/payroll/employeeSalary.model.js';
import { PayrollRun } from '../src/modules/payroll/payrollRun.model.js';
import { Payslip } from '../src/modules/payroll/payslip.model.js';
import { payrollService } from '../src/modules/payroll/payroll.service.js';
import { LeaveRequest } from '../src/modules/leave/leaveRequest.model.js';
import { LeaveType } from '../src/modules/leave/leaveType.model.js';

describe('Phase 5: Payroll Engine Self-Tests', () => {
  let org;
  let testEmp;
  let hrAdminUser;
  let superAdminUser;
  let payrollRun;

  before(async () => {
    await connectDB();
    org = await Organization.findOne();
    testEmp = await Employee.findOne({ workEmail: 'employee@peoplecore.local' });
    hrAdminUser = await User.findOne({ email: 'hr@peoplecore.local' });
    superAdminUser = await User.findOne({ email: 'admin@peoplecore.local' });

    // Ensure test employee is active
    if (testEmp) {
      testEmp.status = 'ACTIVE';
      await testEmp.save();
    }

    // Clean up any test runs for 2026-03 or test periods
    await PayrollRun.deleteMany({ organizationId: org._id, period: '2026-03' });
    await Payslip.deleteMany({ organizationId: org._id, 'period.periodString': 'March 2026' });
  });

  after(async () => {
    await disconnectDB();
  });

  test('1. Default salary structure seeds and assigns compensation to employee', async () => {
    const structure = await payrollService.seedDefaultSalaryStructure(org._id);
    assert.ok(structure, 'Salary structure should be created or found');
    assert.equal(structure.code, 'TECH_STD');
    assert.ok(structure.components.some((c) => c.code === 'BASIC'));
    assert.ok(structure.components.some((c) => c.code === 'PF_EMPLOYEE'));

    const salary = await payrollService.getOrCreateEmployeeSalary(testEmp._id, org._id, 600000);
    assert.ok(salary, 'Employee salary should be created');
    assert.equal(salary.annualCtc, 600000);
    assert.equal(salary.monthlyGross, 50000);

    const basicComp = salary.components.find((c) => c.code === 'BASIC');
    assert.equal(basicComp.monthlyAmount, 25000); // 50% of 50000
  });

  test('2. Opening draft payroll run for period March 2026 succeeds', async () => {
    payrollRun = await payrollService.createPayrollRun({
      orgId: org._id,
      year: 2026,
      month: 3,
      payoutDate: '2026-03-31',
      userId: hrAdminUser._id,
      notes: 'March 2026 Regular Salary Cycle',
    });

    assert.ok(payrollRun);
    assert.equal(payrollRun.period, '2026-03');
    assert.equal(payrollRun.status, 'DRAFT');
    assert.equal(payrollRun.preparedBy.toString(), hrAdminUser._id.toString());
  });

  test('3. Deterministic calculation engine computes earnings, PF, PT and net pay in words', async () => {
    const calculatedRun = await payrollService.calculatePayrollRun(payrollRun._id, org._id, hrAdminUser._id);

    assert.equal(calculatedRun.status, 'CALCULATED');
    assert.ok(calculatedRun.totals.totalEmployees > 0, 'Should have processed employees');
    assert.ok(calculatedRun.totals.totalGrossPay > 0, 'Total gross pay must be positive');
    assert.ok(calculatedRun.totals.totalNetPay > 0, 'Total net pay must be positive');

    // Verify generated payslip for test employee
    const payslip = await Payslip.findOne({ payrollRunId: payrollRun._id, employeeId: testEmp._id });
    assert.ok(payslip, 'Payslip must be generated for employee');
    assert.equal(payslip.period.periodString, 'March 2026');
    assert.equal(payslip.attendanceSnapshot.totalDays, 31);
    assert.equal(payslip.attendanceSnapshot.payableDays, 31);

    // Verify statutory deductions: 12% PF on Basic (25000 * 0.12 = 3000)
    const pfDeduction = payslip.deductions.find((d) => d.code === 'PF_EMPLOYEE');
    assert.ok(pfDeduction);
    assert.equal(pfDeduction.amount, 3000);

    // Professional Tax: ₹200 for gross > 15000
    const ptDeduction = payslip.deductions.find((d) => d.code === 'PROF_TAX');
    assert.ok(ptDeduction);
    assert.equal(ptDeduction.amount, 200);

    // Net pay: 50000 - (3000 + 200) = 46800
    assert.equal(payslip.grossEarnings, 50000);
    assert.equal(payslip.totalDeductions, 3200);
    assert.equal(payslip.netPay, 46800);
    assert.ok(payslip.netPayInWords.includes('Forty-Six Thousand Eight Hundred'));
  });

  test('4. Maker-checker constraint prevents preparer from approving own payroll run', async () => {
    // Submit for review first
    await payrollService.submitPayrollRunForReview(payrollRun._id, org._id, hrAdminUser._id);

    // Attempt self-approval by hrAdminUser (preparer)
    await assert.rejects(
      async () => {
        await payrollService.approvePayrollRun(payrollRun._id, org._id, hrAdminUser._id);
      },
      (err) => {
        return err.code === 'MAKER_CHECKER_VIOLATION' && err.statusCode === 403;
      },
      'Preparer must be rejected from approving own payroll run'
    );
  });

  test('5. Independent reviewer approves, locks run and publishes employee payslips', async () => {
    // Independent approver (superAdminUser) approves run
    const approvedRun = await payrollService.approvePayrollRun(payrollRun._id, org._id, superAdminUser._id);
    assert.equal(approvedRun.status, 'APPROVED');
    assert.equal(approvedRun.approvedBy.toString(), superAdminUser._id.toString());

    // Lock payroll run
    const lockedRun = await payrollService.lockPayrollRun(payrollRun._id, org._id, superAdminUser._id);
    assert.equal(lockedRun.status, 'LOCKED');
    assert.equal(lockedRun.publishedPayslips, true);

    // Verify payslips are now marked PUBLISHED
    const employeePayslips = await payrollService.getEmployeePayslips(testEmp._id, org._id);
    assert.ok(employeePayslips.length > 0, 'Employee should have published payslip');
    assert.equal(employeePayslips[0].status, 'PUBLISHED');
  });

  test('6. Bank advice & payroll register CSV export generates valid corporate format', async () => {
    const csvData = await payrollService.exportPayrollRegisterCsv(payrollRun._id, org._id);
    assert.ok(csvData.includes('Employee Code,Employee Name,Department'));
    assert.ok(csvData.includes('Gross Earnings (INR)'));
    assert.ok(csvData.includes('Net Pay (INR)'));
    assert.ok(csvData.includes('46800'));
  });
});
