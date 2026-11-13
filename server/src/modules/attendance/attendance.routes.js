import express from 'express';
import {
  recordPunchController,
  getTodayStatusController,
  getMyTimesheetController,
  getShiftsController,
  createShiftController,
  updateShiftController,
  setDefaultShiftController,
  deleteShiftController,
  submitRegularizationController,
  approveRegularizationController,
} from './attendance.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../config/roles.js';

const router = express.Router();

router.use(authenticate);

// Employee Attendance Endpoints
router.get('/today', getTodayStatusController);
router.post('/punches', recordPunchController);
router.get('/me', getMyTimesheetController);
router.get('/shifts', getShiftsController);
router.post('/regularizations', submitRegularizationController);

// Shift & Office Timing Administration (HR & Super Admin)
const SHIFT_ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN];
router.post('/shifts', authorize(...SHIFT_ADMIN_ROLES), createShiftController);
router.put('/shifts/:id', authorize(...SHIFT_ADMIN_ROLES), updateShiftController);
router.post('/shifts/:id/set-default', authorize(...SHIFT_ADMIN_ROLES), setDefaultShiftController);
router.delete('/shifts/:id', authorize(...SHIFT_ADMIN_ROLES), deleteShiftController);

// Approvals (Managers & HR)
router.post(
  '/regularizations/:id/approve',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE, ROLES.MANAGER),
  approveRegularizationController
);

export const attendanceRoutes = router;
