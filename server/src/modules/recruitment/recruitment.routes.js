import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../config/roles.js';
import {
  createRequisitionController,
  getRequisitionsController,
  getRequisitionByIdController,
  updateRequisitionController,
  addCandidateController,
  getCandidatesController,
  updateCandidateStageController,
  convertCandidateToEmployeeController,
} from './recruitment.controller.js';

const router = Router();

// All recruitment routes require valid authentication
router.use(authenticate);

// Job Requisitions endpoints
router.get('/requisitions', requirePermission(PERMISSIONS.RECRUITMENT_READ), getRequisitionsController);
router.post('/requisitions', requirePermission(PERMISSIONS.RECRUITMENT_WRITE), createRequisitionController);
router.get('/requisitions/:id', requirePermission(PERMISSIONS.RECRUITMENT_READ), getRequisitionByIdController);
router.put('/requisitions/:id', requirePermission(PERMISSIONS.RECRUITMENT_WRITE), updateRequisitionController);

// Candidate Pipeline endpoints
router.get('/candidates', requirePermission(PERMISSIONS.RECRUITMENT_READ), getCandidatesController);
router.post('/candidates', requirePermission(PERMISSIONS.RECRUITMENT_WRITE), addCandidateController);
router.put('/candidates/:id/stage', requirePermission(PERMISSIONS.RECRUITMENT_WRITE), updateCandidateStageController);
router.post('/candidates/:id/convert', requirePermission(PERMISSIONS.RECRUITMENT_WRITE), convertCandidateToEmployeeController);

export { router as recruitmentRoutes };
export default router;
