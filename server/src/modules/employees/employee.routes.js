import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getEmployeesController,
  getEmployeeByIdController,
  createEmployeeController,
  updateEmployeeController,
  transferEmployeeController,
  getEmployeeJobHistoryController,
  resendEmployeeInviteController,
  getEmployee360ProfileController,
  getMy360ProfileController,
  recordAdminLeaveController,
  addEmployeeDocumentController,
  deleteEmployeeDocumentController,
} from './employee.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../config/roles.js';

import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let uploadDir = path.resolve(__dirname, '../../../uploads/documents');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  uploadDir = path.join(os.tmpdir(), 'uploads/documents');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

const router = express.Router();

// All employee routes require authentication
router.use(authenticate);

// Directory & List
router.get('/', getEmployeesController);

// Creation
router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE),
  createEmployeeController
);

// My Own Profile (Personal 360 view for logged-in employee)
router.get('/me/360-summary', getMy360ProfileController);

// Individual Employee Profile
router.get('/:id', getEmployeeByIdController);

// Update Profile
router.patch(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE),
  updateEmployeeController
);

// Lifecycle Transfer / Promotion
router.post(
  '/:id/transfer',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN),
  transferEmployeeController
);

// Job & Lifecycle History
router.get('/:id/history', getEmployeeJobHistoryController);

// Comprehensive 360-Degree Employee Intelligence Profile
router.get('/:id/360-summary', getEmployee360ProfileController);

// Admin Records Leave on Behalf of Employee (e.g. email/phone request)
router.post(
  '/:id/admin-leave',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE),
  recordAdminLeaveController
);

// Employee Documents Management
router.post(
  '/:id/documents',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE),
  upload.single('file'),
  addEmployeeDocumentController
);

router.delete(
  '/:id/documents/:docId',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE),
  deleteEmployeeDocumentController
);

// Resend Login Welcome & Password Setup Invitation
router.post(
  '/:id/resend-invite',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE),
  resendEmployeeInviteController
);

export default router;
