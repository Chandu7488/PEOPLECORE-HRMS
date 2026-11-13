import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../config/roles.js';
import {
  createGoalController,
  getGoalsController,
  updateGoalProgressController,
  evaluateGoalController,
} from './performance.controller.js';

const router = Router();
router.use(authenticate);

router.get('/goals', requirePermission(PERMISSIONS.PERFORMANCE_READ_SELF), getGoalsController);
router.post('/goals', requirePermission(PERMISSIONS.PERFORMANCE_READ_SELF), createGoalController);
router.put('/goals/:id/progress', requirePermission(PERMISSIONS.PERFORMANCE_READ_SELF), updateGoalProgressController);
router.put('/goals/:id/evaluate', requirePermission(PERMISSIONS.PERFORMANCE_WRITE), evaluateGoalController);

export { router as performanceRoutes };
export default router;
