import { payrollService } from './payroll.service.js';
import { organizationService } from '../organization/organization.service.js';
import { Employee } from '../employees/employee.model.js';
import { SalaryStructure } from './salaryStructure.model.js';

/**
 * Controller: List all payroll runs
 */
export const getPayrollRunsController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const runs = await payrollService.getPayrollRuns(org._id);
    res.status(200).json({
      success: true,
      data: runs,
      message: 'Payroll runs retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Create a new monthly payroll run
 */
export const createPayrollRunController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const { year, month, payoutDate, notes } = req.body;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        error: { message: 'Year and Month are required to open a payroll run' },
      });
    }

    const run = await payrollService.createPayrollRun({
      orgId: org._id,
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      payoutDate,
      userId: req.user._id,
      notes,
    });

    res.status(201).json({
      success: true,
      data: run,
      message: `Draft payroll run for ${run.period} created successfully`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get specific payroll run and its payslips
 */
export const getPayrollRunByIdController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const result = await payrollService.getPayrollRunById(req.params.id, org._id);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Payroll run details retrieved',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Calculate payroll with attendance & unpaid leave inputs
 */
export const calculatePayrollRunController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const run = await payrollService.calculatePayrollRun(req.params.id, org._id, req.user._id);
    res.status(200).json({
      success: true,
      data: run,
      message: `Payroll for period ${run.period} calculated successfully across ${run.totals.totalEmployees} employees`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Submit payroll run for review
 */
export const submitReviewPayrollRunController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const run = await payrollService.submitPayrollRunForReview(req.params.id, org._id, req.user._id);
    res.status(200).json({
      success: true,
      data: run,
      message: `Payroll run ${run.period} submitted for maker-checker review`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Approve payroll run (enforces maker-checker)
 */
export const approvePayrollRunController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const bypassMakerChecker = req.query.bypass === 'true';
    const run = await payrollService.approvePayrollRun(req.params.id, org._id, req.user._id, bypassMakerChecker);
    res.status(200).json({
      success: true,
      data: run,
      message: `Payroll run ${run.period} approved successfully`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Lock payroll run and publish payslips
 */
export const lockPayrollRunController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const run = await payrollService.lockPayrollRun(req.params.id, org._id, req.user._id);
    res.status(200).json({
      success: true,
      data: run,
      message: `Payroll run ${run.period} locked and payslips published successfully`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Export Payroll Register and Bank Advice as CSV
 */
export const exportPayrollRegisterController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const csvData = await payrollService.exportPayrollRegisterCsv(req.params.id, org._id);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-register-${req.params.id}.csv"`);
    res.status(200).send(csvData);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get published payslips for the logged-in employee
 */
export const getMyPayslipsController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(200).json({ success: true, data: [] });
    }

    const payslips = await payrollService.getEmployeePayslips(employee._id, org._id);
    res.status(200).json({
      success: true,
      data: payslips,
      message: 'Employee payslips retrieved',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get specific payslip details
 */
export const getPayslipByIdController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const payslip = await payrollService.getPayslipById(req.params.id, org._id, req.user);
    res.status(200).json({
      success: true,
      data: payslip,
      message: 'Payslip retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Salary Structures
 */
export const getSalaryStructuresController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    await payrollService.seedDefaultSalaryStructure(org._id);
    const structures = await SalaryStructure.find({ organizationId: org._id });
    res.status(200).json({
      success: true,
      data: structures,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Employee Salary Allocation
 */
export const getEmployeeSalaryController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const salary = await payrollService.getOrCreateEmployeeSalary(req.params.employeeId, org._id);
    res.status(200).json({
      success: true,
      data: salary,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Assign / Revise Employee Salary Allocation
 */
export const assignEmployeeSalaryController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const salary = await payrollService.assignEmployeeSalary(
      req.params.employeeId,
      req.body,
      org._id,
      req.user._id
    );
    res.status(200).json({
      success: true,
      data: salary,
      message: 'Employee salary updated and recorded in revision history',
    });
  } catch (err) {
    next(err);
  }
};
