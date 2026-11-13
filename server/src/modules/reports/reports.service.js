import { Employee } from '../employees/employee.model.js';
import { Department } from '../organization/department.model.js';
import { Designation } from '../organization/designation.model.js';
import { LeaveRequest } from '../leave/leaveRequest.model.js';
import { LeaveLedger } from '../leave/leaveLedger.model.js';
import { LeaveType } from '../leave/leaveType.model.js';
import { AttendanceDay } from '../attendance/attendanceDay.model.js';
import { PayrollRun } from '../payroll/payrollRun.model.js';
import { Payslip } from '../payroll/payslip.model.js';
import { JobRequisition } from '../recruitment/jobRequisition.model.js';
import { Candidate } from '../recruitment/candidate.model.js';
import { Goal } from '../performance/goal.model.js';
import { Asset } from '../assets/asset.model.js';
import { ExpenseClaim } from '../expenses/expense.model.js';
import { HelpdeskTicket } from '../helpdesk/helpdesk.model.js';

/**
 * Enterprise Reports & Analytics Service
 * Provides executive dashboards, workforce intelligence metrics, and multi-format exports
 */
export class ReportsService {
  /**
   * Aggregates holistic company-wide executive analytics
   */
  async getExecutiveOverview(orgId) {
    // 1. Workforce Headcount & Breakdown
    const totalEmployees = await Employee.countDocuments({ organizationId: orgId });
    const activeEmployees = await Employee.countDocuments({ organizationId: orgId, status: 'ACTIVE' });
    const probationEmployees = await Employee.countDocuments({ organizationId: orgId, status: 'PROBATION' });
    const noticePeriodEmployees = await Employee.countDocuments({ organizationId: orgId, status: 'NOTICE_PERIOD' });
    const terminatedEmployees = await Employee.countDocuments({ organizationId: orgId, status: 'TERMINATED' });

    // Breakdown by Department
    const departmentBreakdown = await Employee.aggregate([
      { $match: { organizationId: orgId, status: { $ne: 'TERMINATED' } } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'dept',
        },
      },
      {
        $project: {
          departmentName: { $ifNull: [{ $arrayElemAt: ['$dept.name', 0] }, 'Unassigned'] },
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Breakdown by Gender
    const genderBreakdown = await Employee.aggregate([
      { $match: { organizationId: orgId, status: { $ne: 'TERMINATED' } } },
      { $group: { _id: '$gender', count: { $sum: 1 } } },
    ]);

    // 2. Leave & Absenteeism Metrics
    const currentYear = new Date().getFullYear();
    const approvedLeavesCount = await LeaveRequest.countDocuments({
      organizationId: orgId,
      status: 'APPROVED',
      startDate: { $gte: new Date(`${currentYear}-01-01`) },
    });

    // 3. Payroll Disbursement Metrics
    const latestPayrollRun = await PayrollRun.findOne({ organizationId: orgId }).sort({ createdAt: -1 });

    // 4. Recruitment Funnel Velocity
    const openRequisitions = await JobRequisition.countDocuments({ organizationId: orgId, status: 'OPEN' });
    const totalCandidates = await Candidate.countDocuments({ organizationId: orgId });
    const hiredCandidates = await Candidate.countDocuments({ organizationId: orgId, stage: 'HIRED' });

    // 5. Operations & Assets
    const totalAssets = await Asset.countDocuments({ organizationId: orgId });
    const allocatedAssets = await Asset.countDocuments({ organizationId: orgId, status: 'ALLOCATED' });
    const pendingExpenses = await ExpenseClaim.countDocuments({ organizationId: orgId, status: 'SUBMITTED' });
    const openTickets = await HelpdeskTicket.countDocuments({ organizationId: orgId, status: { $in: ['OPEN', 'IN_PROGRESS'] } });

    // 6. Performance Goals
    const totalGoals = await Goal.countDocuments({ organizationId: orgId });
    const completedGoals = await Goal.countDocuments({ organizationId: orgId, status: 'COMPLETED' });

    const pmsStats = {
      totalGoals,
      completedGoals,
      completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
    };

    const assetStats = {
      totalAssets,
      allocatedAssets,
      assetUtilizationPercentage: totalAssets > 0 ? Math.round((allocatedAssets / totalAssets) * 100) : 0,
      pendingExpenseClaims: pendingExpenses,
      openHelpdeskTickets: openTickets,
    };

    const leaveStats = {
      totalLeavesApprovedYearToDate: approvedLeavesCount,
    };

    return {
      totalEmployees,
      departmentBreakdown,
      pmsStats,
      assetStats,
      leaveStats,
      workforce: {
        totalEmployees,
        activeEmployees,
        probationEmployees,
        noticePeriodEmployees,
        terminatedEmployees,
        retentionRatePercentage: totalEmployees > 0 ? Math.round(((totalEmployees - terminatedEmployees) / totalEmployees) * 100) : 100,
        departmentBreakdown,
        genderBreakdown,
      },
      leaveAndAttendance: leaveStats,
      payroll: {
        latestPeriod: latestPayrollRun?.period || 'No runs yet',
        latestRunStatus: latestPayrollRun?.status || 'N/A',
        totalGrossPayable: latestPayrollRun?.totals?.totalGrossEarnings || 0,
        totalNetDisbursed: latestPayrollRun?.totals?.totalNetPay || 0,
        totalPfContribution: latestPayrollRun?.totals?.totalPfEmployer || 0,
      },
      recruitment: {
        openRequisitions,
        totalCandidatesInPipeline: totalCandidates,
        totalHired: hiredCandidates,
        conversionRatePercentage: totalCandidates > 0 ? Math.round((hiredCandidates / totalCandidates) * 100) : 0,
      },
      operations: assetStats,
    };
  }

  /**
   * Generates employee master census data (JSON + CSV)
   */
  async generateEmployeeCensusReport(orgId) {
    const employees = await Employee.find({ organizationId: orgId })
      .populate('departmentId', 'name code')
      .populate('designationId', 'title code')
      .sort({ employeeCode: 1 });

    const rows = employees.map((e) => ({
      employeeCode: e.employeeCode,
      firstName: e.firstName,
      lastName: e.lastName,
      fullName: `${e.firstName} ${e.lastName}`,
      workEmail: e.workEmail,
      phone: e.phone || '',
      department: e.departmentId?.name || 'General',
      designation: e.designationId?.title || 'Standard',
      joiningDate: e.joiningDate ? new Date(e.joiningDate).toISOString().split('T')[0] : '',
      status: e.status,
      employmentType: e.employmentType,
    }));

    // Generate CSV string
    const headers = ['Employee Code', 'Full Name', 'Work Email', 'Phone', 'Department', 'Designation', 'Joining Date', 'Status', 'Employment Type'];
    const csvLines = [headers.join(',')];
    rows.forEach((r) => {
      csvLines.push(
        `"${r.employeeCode}","${r.fullName}","${r.workEmail}","${r.phone}","${r.department}","${r.designation}","${r.joiningDate}","${r.status}","${r.employmentType}"`
      );
    });

    return { rows, records: rows, csv: csvLines.join('\n') };
  }

  /**
   * Generates leave balance report per employee and leave type
   */
  async generateLeaveBalanceReport(orgId, year = 2026) {
    const employees = await Employee.find({ organizationId: orgId, status: { $ne: 'TERMINATED' } }).sort({ employeeCode: 1 });
    const leaveTypes = await LeaveType.find({ organizationId: orgId, isActive: true });

    const rows = [];
    for (const emp of employees) {
      const balances = {};
      for (const lt of leaveTypes) {
        const lastLedger = await LeaveLedger.findOne({
          employeeId: emp._id,
          leaveTypeId: lt._id,
          year,
        }).sort({ createdAt: -1 });

        balances[lt.code] = lastLedger ? lastLedger.balanceAfter : 0;
      }

      rows.push({
        employeeCode: emp.employeeCode,
        fullName: `${emp.firstName} ${emp.lastName}`,
        workEmail: emp.workEmail,
        year,
        ...balances,
      });
    }

    const typeHeaders = leaveTypes.map((t) => t.code);
    const headers = ['Employee Code', 'Full Name', 'Work Email', 'Year', ...typeHeaders];
    const csvLines = [headers.join(',')];

    rows.forEach((r) => {
      const typeValues = typeHeaders.map((code) => r[code] || 0);
      csvLines.push(`"${r.employeeCode}","${r.fullName}","${r.workEmail}","${r.year}",${typeValues.join(',')}`);
    });

    return { year, rows, records: rows, csv: csvLines.join('\n') };
  }

  /**
   * Generates corporate payroll register report
   */
  async generatePayrollRegisterReport(orgId, periodString = null) {
    const query = { organizationId: orgId };
    if (periodString) {
      query['period.periodString'] = periodString;
    }

    const payslips = await Payslip.find(query).sort({ 'period.year': -1, 'period.month': -1, 'employeeSnapshot.employeeCode': 1 });

    const rows = payslips.map((p) => ({
      payslipId: p._id,
      employeeCode: p.employeeSnapshot?.employeeCode || 'N/A',
      employeeName: p.employeeSnapshot?.name || 'N/A',
      department: p.employeeSnapshot?.department || '',
      period: p.period?.periodString || '',
      grossEarnings: p.grossEarnings || 0,
      totalDeductions: p.totalDeductions || 0,
      netPay: p.netPay || 0,
      status: p.status,
    }));

    const headers = ['Employee Code', 'Employee Name', 'Department', 'Period', 'Gross Earnings', 'Total Deductions', 'Net Pay', 'Status'];
    const csvLines = [headers.join(',')];
    rows.forEach((r) => {
      csvLines.push(
        `"${r.employeeCode}","${r.employeeName}","${r.department}","${r.period}",${r.grossEarnings},${r.totalDeductions},${r.netPay},"${r.status}"`
      );
    });

    return { rows, records: rows, csv: csvLines.join('\n') };
  }
}

export const reportsService = new ReportsService();
