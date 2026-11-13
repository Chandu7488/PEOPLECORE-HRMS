import express from 'express';
import {
  getNoticesController,
  getNoticeByIdController,
  createNoticeController,
  updateNoticeController,
  acknowledgeNoticeController,
  getAcknowledgementReportController,
  addCommentController,
  getCommentsController,
} from './notice.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../config/roles.js';

const router = express.Router();

router.use(authenticate);

// Notice retrieval (server-enforced audience targeting)
router.get('/', getNoticesController);
router.get('/:id', getNoticeByIdController);

// Notice creation (Super Admin, HR Admin, HR Executive, Executive, Manager)
router.post(
  '/',
  authorize(
    ROLES.SUPER_ADMIN,
    ROLES.HR_ADMIN,
    ROLES.HR_EXECUTIVE,
    ROLES.EXECUTIVE,
    ROLES.MANAGER
  ),
  createNoticeController
);

// Notice update (with revision snapshot)
router.patch(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.EXECUTIVE, ROLES.MANAGER),
  updateNoticeController
);

// Acknowledgements
router.post('/:id/acknowledge', acknowledgeNoticeController);
router.get(
  '/:id/receipts',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.AUDITOR),
  getAcknowledgementReportController
);

// Comments
router.post('/:id/comments', addCommentController);
router.get('/:id/comments', getCommentsController);

export default router;
