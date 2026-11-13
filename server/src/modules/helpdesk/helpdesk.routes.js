import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../config/roles.js';
import {
  createTicketController,
  getTicketsController,
  updateTicketStatusController,
} from './helpdesk.controller.js';

const router = Router();
router.use(authenticate);

router.get('/tickets', requirePermission(PERMISSIONS.HELPDESK_READ_SELF), getTicketsController);
router.post('/tickets', requirePermission(PERMISSIONS.HELPDESK_CREATE), createTicketController);
router.put('/tickets/:id', requirePermission(PERMISSIONS.HELPDESK_MANAGE_ALL), updateTicketStatusController);

export { router as helpdeskRoutes };
export default router;
