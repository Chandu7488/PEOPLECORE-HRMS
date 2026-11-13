import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../config/roles.js';
import {
  getExecutiveOverviewController,
  getEmployeeCensusReportController,
  getLeaveBalanceReportController,
  getPayrollRegisterReportController,
} from './reports.controller.js';

const router = Router();
router.use(authenticate);

router.get('/overview', requirePermission(PERMISSIONS.REPORTS_READ), getExecutiveOverviewController);
router.get('/census', requirePermission(PERMISSIONS.REPORTS_READ), getEmployeeCensusReportController);
router.get('/leave-balances', requirePermission(PERMISSIONS.REPORTS_READ), getLeaveBalanceReportController);
router.get('/payroll-register', requirePermission(PERMISSIONS.REPORTS_READ), getPayrollRegisterReportController);

export { router as reportsRoutes };
export default router;
