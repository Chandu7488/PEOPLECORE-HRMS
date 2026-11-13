import express from 'express';
import {
  getOrganizationController,
  updateOrganizationController,
  getLocationsController,
  createLocationController,
  getDepartmentsController,
  createDepartmentController,
  getDesignationsController,
  createDesignationController,
  getOrganizationMasterController,
} from './organization.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../config/roles.js';

const router = express.Router();

// All organization routes require authenticated session
router.use(authenticate);

// Master Aggregated Data
router.get('/master', getOrganizationMasterController);

// Profile
router.get('/', getOrganizationController);
router.patch('/', authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN), updateOrganizationController);

// Locations
router.get('/locations', getLocationsController);
router.post('/locations', authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN), createLocationController);

// Departments
router.get('/departments', getDepartmentsController);
router.post('/departments', authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN), createDepartmentController);

// Designations
router.get('/designations', getDesignationsController);
router.post('/designations', authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN), createDesignationController);

export default router;
