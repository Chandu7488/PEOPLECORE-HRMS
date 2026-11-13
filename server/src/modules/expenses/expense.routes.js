import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../config/roles.js';
import {
  submitClaimController,
  getClaimsController,
  reviewClaimController,
} from './expense.controller.js';

const router = Router();
router.use(authenticate);

router.get('/claims', requirePermission(PERMISSIONS.EXPENSES_READ_SELF), getClaimsController);
router.post('/claims', requirePermission(PERMISSIONS.EXPENSES_APPLY), submitClaimController);
router.put('/claims/:id/review', requirePermission(PERMISSIONS.EXPENSES_APPROVE), reviewClaimController);

export { router as expenseRoutes };
export default router;
