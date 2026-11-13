import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Organization } from '../src/modules/organization/organization.model.js';
import { User } from '../src/modules/users/user.model.js';
import { Employee } from '../src/modules/employees/employee.model.js';
import { reportsService } from '../src/modules/reports/reports.service.js';
import { auditService } from '../src/modules/audit/audit.service.js';
import { recordAuditLog, AuditLog } from '../src/modules/audit/audit.model.js';

describe('Phase 8: Enterprise Analytics, Reports & Audit Trail Self-Tests', () => {
  let org;
  let hrAdminUser;
  let testEmp;

  before(async () => {
    await connectDB();
    org = await Organization.findOne();
    hrAdminUser = await User.findOne({ email: 'hr@peoplecore.local' });
    testEmp = await Employee.findOne({ workEmail: 'employee@peoplecore.local' });

    // Guard: Ensure testEmp is ACTIVE in case a prior suite modified it
    if (testEmp) {
      testEmp.status = 'ACTIVE';
      await testEmp.save();
    }
  });

  after(async () => {
    await disconnectDB();
  });

  test('1. Executive Overview Analytics Aggregation', async () => {
    const overview = await reportsService.getExecutiveOverview(org._id);

    assert.ok(overview, 'Overview object should be returned');
    assert.ok(typeof overview.totalEmployees === 'number', 'totalEmployees should be a number');
    assert.ok(overview.totalEmployees >= 1, 'Should have at least 1 employee in test database');
    assert.ok(Array.isArray(overview.departmentBreakdown), 'departmentBreakdown should be an array');
    assert.ok(overview.leaveStats, 'leaveStats must be present');
    assert.ok(overview.pmsStats, 'pmsStats must be present');
    assert.ok(overview.assetStats, 'assetStats must be present');
  });

  test('2. Employee Census Report (JSON & CSV)', async () => {
    const report = await reportsService.generateEmployeeCensusReport(org._id);

    assert.ok(report, 'Census report object returned');
    assert.ok(Array.isArray(report.records), 'records must be an array');
    assert.ok(report.csv, 'CSV export string must be present');
    assert.match(report.csv, /Employee Code,Full Name,Work Email/i, 'CSV must have correct header columns');
  });

  test('3. Leave Balance Report (JSON & CSV)', async () => {
    const report = await reportsService.generateLeaveBalanceReport(org._id, 2026);

    assert.ok(report, 'Leave balance report object returned');
    assert.equal(report.year, 2026);
    assert.ok(Array.isArray(report.records), 'records must be an array');
    assert.ok(report.csv, 'CSV export must be present');
    assert.match(report.csv, /Employee Code,Full Name,Work Email,Year/i, 'CSV must have leave category columns');
  });

  test('4. Payroll Register Report (JSON & CSV)', async () => {
    const report = await reportsService.generatePayrollRegisterReport(org._id);

    assert.ok(report, 'Payroll register report object returned');
    assert.ok(Array.isArray(report.records), 'records must be an array');
    assert.ok(report.csv, 'CSV export must be present');
    assert.match(report.csv, /Employee Code,Employee Name,Department,Period,Gross Earnings/i, 'CSV must have financial summary columns');
  });

  test('5. Audit Trail Event Recording & Querying', async () => {
    const testAction = 'TEST_SECURITY_CHECK_EVENT';

    // Record an audit log
    await recordAuditLog({
      action: testAction,
      actorId: hrAdminUser._id,
      actorEmail: hrAdminUser.email,
      targetId: String(testEmp._id),
      ipAddress: '127.0.0.1',
      userAgent: 'NodeTestAgent/1.0',
      status: 'SUCCESS',
      metadata: { phase: 8, benchmark: 'Enterprise Compliance' },
    });

    // Query logs
    const result = await auditService.getAuditLogs({
      action: testAction,
      limit: 10,
    });

    assert.ok(result, 'Audit service returned query result');
    assert.ok(result.logs.length >= 1, 'Should find the recorded audit event');
    assert.equal(result.logs[0].action, testAction);
    assert.equal(result.logs[0].status, 'SUCCESS');

    // Query summary
    const summary = await auditService.getAuditSummary();
    assert.ok(summary, 'Audit summary returned');
    assert.ok(summary.totalEvents >= 1, 'Total events count must be >= 1');

    // Clean up test audit log
    await AuditLog.deleteMany({ action: testAction });
  });
});
