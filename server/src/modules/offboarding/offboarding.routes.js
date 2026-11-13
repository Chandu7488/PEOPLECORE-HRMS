import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../config/roles.js';
import {
  submitResignationController,
  getResignationsController,
  getResignationByIdController,
  reviewResignationController,
  withdrawResignationController,
  updateClearanceTaskController,
  calculateSettlementController,
  finalizeSettlementController,
} from './offboarding.controller.js';

const router = Router();

// All offboarding routes require authentication
router.use(authenticate);

// Resignations
router.get('/resignations', requirePermission(PERMISSIONS.OFFBOARDING_READ_SELF), getResignationsController);
router.post('/resignations', requirePermission(PERMISSIONS.OFFBOARDING_APPLY), submitResignationController);
router.get('/resignations/:id', requirePermission(PERMISSIONS.OFFBOARDING_READ_SELF), getResignationByIdController);
router.put('/resignations/:id/review', requirePermission(PERMISSIONS.OFFBOARDING_MANAGE_ALL), reviewResignationController);
router.post('/resignations/:id/withdraw', requirePermission(PERMISSIONS.OFFBOARDING_APPLY), withdrawResignationController);

// Clearance Checklist & Tasks
router.put('/tasks/:taskId', requirePermission(PERMISSIONS.OFFBOARDING_MANAGE_ALL), updateClearanceTaskController);

// Full & Final Settlement
router.get('/resignations/:id/settlement', requirePermission(PERMISSIONS.OFFBOARDING_MANAGE_ALL), calculateSettlementController);
router.post('/resignations/:id/settle', requirePermission(PERMISSIONS.OFFBOARDING_MANAGE_ALL), finalizeSettlementController);

export { router as offboardingRoutes };
export default router;
