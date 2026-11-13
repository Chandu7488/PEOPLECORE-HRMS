import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../config/roles.js';
import {
  getAuditLogsController,
  getAuditSummaryController,
} from './audit.controller.js';

const router = Router();
router.use(authenticate);

router.get('/logs', requirePermission(PERMISSIONS.AUDIT_READ), getAuditLogsController);
router.get('/summary', requirePermission(PERMISSIONS.AUDIT_READ), getAuditSummaryController);

export { router as auditRoutes };
export default router;
