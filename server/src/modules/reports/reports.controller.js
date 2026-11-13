import { reportsService } from './reports.service.js';

export const getExecutiveOverviewController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const overview = await reportsService.getExecutiveOverview(orgId);
    res.status(200).json({
      success: true,
      data: overview,
      message: 'Executive overview analytics retrieved',
    });
  } catch (err) {
    next(err);
  }
};

export const getEmployeeCensusReportController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { format } = req.query;
    const report = await reportsService.generateEmployeeCensusReport(orgId);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="employee_census.csv"');
      return res.status(200).send(report.csv);
    }

    res.status(200).json({
      success: true,
      data: report,
      message: 'Employee census report generated',
    });
  } catch (err) {
    next(err);
  }
};

export const getLeaveBalanceReportController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { year, format } = req.query;
    const report = await reportsService.generateLeaveBalanceReport(orgId, year ? Number(year) : 2026);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="leave_balances_${year || 2026}.csv"`);
      return res.status(200).send(report.csv);
    }

    res.status(200).json({
      success: true,
      data: report,
      message: 'Leave balance report generated',
    });
  } catch (err) {
    next(err);
  }
};

export const getPayrollRegisterReportController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { period, format } = req.query;
    const report = await reportsService.generatePayrollRegisterReport(orgId, period || null);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="payroll_register.csv"');
      return res.status(200).send(report.csv);
    }

    res.status(200).json({
      success: true,
      data: report,
      message: 'Payroll register report generated',
    });
  } catch (err) {
    next(err);
  }
};
