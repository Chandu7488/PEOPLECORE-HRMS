import express from 'express';
import {
  getPayrollRunsController,
  createPayrollRunController,
  getPayrollRunByIdController,
  calculatePayrollRunController,
  submitReviewPayrollRunController,
  approvePayrollRunController,
  lockPayrollRunController,
  exportPayrollRegisterController,
  getMyPayslipsController,
  getPayslipByIdController,
  getSalaryStructuresController,
  getEmployeeSalaryController,
  assignEmployeeSalaryController,
} from './payroll.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../config/roles.js';

const router = express.Router();

router.use(authenticate);

// Employee self-service
router.get('/payslips/me', getMyPayslipsController);
router.get('/payslips/:id', getPayslipByIdController);

// HR / Payroll Admin Operations
const PAYROLL_ROLES = [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.PAYROLL_ADMIN];

router.get('/runs', authorize(...PAYROLL_ROLES), getPayrollRunsController);
router.post('/runs', authorize(...PAYROLL_ROLES), createPayrollRunController);
router.get('/runs/:id', authorize(...PAYROLL_ROLES), getPayrollRunByIdController);
router.post('/runs/:id/calculate', authorize(...PAYROLL_ROLES), calculatePayrollRunController);
router.post('/runs/:id/submit-review', authorize(...PAYROLL_ROLES), submitReviewPayrollRunController);
router.post('/runs/:id/approve', authorize(...PAYROLL_ROLES), approvePayrollRunController);
router.post('/runs/:id/lock', authorize(...PAYROLL_ROLES), lockPayrollRunController);
router.get('/runs/:id/export', authorize(...PAYROLL_ROLES), exportPayrollRegisterController);

// Compensation Structures & Employee Salary
router.get('/salary-structures', authorize(...PAYROLL_ROLES), getSalaryStructuresController);
router.get('/employee-salary/:employeeId', authorize(...PAYROLL_ROLES), getEmployeeSalaryController);
router.post('/employee-salary/:employeeId', authorize(...PAYROLL_ROLES), assignEmployeeSalaryController);

export const payrollRoutes = router;
export default router;
