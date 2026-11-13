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

const upload = multer({
  dest: 'uploads/',
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
