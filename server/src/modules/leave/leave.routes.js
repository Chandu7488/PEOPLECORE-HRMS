import express from 'express';
import {
  getLeaveTypesController,
  createLeaveTypeController,
  updateLeaveTypeController,
  deleteLeaveTypeController,
  getMyLeaveBalancesController,
  applyLeaveController,
  getMyLeaveRequestsController,
  getTeamLeaveRequestsController,
  approveLeaveController,
  rejectLeaveController,
  calculateDeductionPreviewController,
} from './leave.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../config/roles.js';

const router = express.Router();

router.use(authenticate);

// Public to all authenticated employees
router.get('/types', getLeaveTypesController);
router.get('/balances/me', getMyLeaveBalancesController);
router.post('/calculate-preview', calculateDeductionPreviewController);
router.post('/requests', applyLeaveController);
router.get('/requests/me', getMyLeaveRequestsController);

// Policy Administration (HR Admin & Super Admin)
router.post(
  '/types',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN),
  createLeaveTypeController
);
router.put(
  '/types/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN),
  updateLeaveTypeController
);
router.delete(
  '/types/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN),
  deleteLeaveTypeController
);

// Approvals (Managers, HR, Admins)
router.get(
  '/requests/team',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE, ROLES.MANAGER, ROLES.EXECUTIVE),
  getTeamLeaveRequestsController
);
router.post(
  '/requests/:id/approve',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE, ROLES.MANAGER, ROLES.EXECUTIVE),
  approveLeaveController
);
router.post(
  '/requests/:id/reject',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE, ROLES.MANAGER, ROLES.EXECUTIVE),
  rejectLeaveController
);

export const leaveRoutes = router;
