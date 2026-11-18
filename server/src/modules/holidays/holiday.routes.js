import express from 'express';
import multer from 'multer';
import {
  getCalendarsController,
  getCalendarByIdController,
  createCalendarController,
  parseCsvController,
  uploadSourceFileController,
  addHolidayController,
  updateHolidayController,
  deleteHolidayController,
  publishCalendarController,
  getCompanyCalendarController,
  getTemplateController,
} from './holiday.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../config/roles.js';

import os from 'os';
import path from 'path';
import fs from 'fs';

const holidayUploadDir = path.join(os.tmpdir(), 'peoplecore-uploads');
try {
  if (!fs.existsSync(holidayUploadDir)) {
    fs.mkdirSync(holidayUploadDir, { recursive: true });
  }
} catch (e) {
  // Silent fallback in constrained environments
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, holidayUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = express.Router();

router.use(authenticate);

// Public to all authenticated employees: view published company calendar
router.get('/company', getCompanyCalendarController);
router.get('/template', getTemplateController);

// Calendar management (Super Admin, HR Admin, HR Executive)
router.get('/calendars', getCalendarsController);
router.get('/calendars/:id', getCalendarByIdController);
router.post(
  '/calendars',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE),
  createCalendarController
);
router.post(
  '/calendars/parse-csv',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE),
  parseCsvController
);
router.post(
  '/calendars/upload-file',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE),
  upload.single('file'),
  uploadSourceFileController
);

// Individual holiday adjustments inside a calendar
router.post(
  '/calendars/:id/holidays',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE),
  addHolidayController
);
router.patch(
  '/calendars/:id/holidays/:hid',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE),
  updateHolidayController
);
router.delete(
  '/calendars/:id/holidays/:hid',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.HR_EXECUTIVE),
  deleteHolidayController
);

// Publishing (Mandates HR Admin or Super Admin approval)
router.post(
  '/calendars/:id/publish',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_ADMIN),
  publishCalendarController
);

export default router;
