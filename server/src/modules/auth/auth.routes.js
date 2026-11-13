import express from 'express';
import {
  loginController,
  refreshController,
  logoutController,
  meController,
  forgotPasswordController,
  validateResetTokenController,
  resetPasswordController,
  changePasswordController,
} from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

/**
 * Public Authentication Routes
 */
router.post('/login', loginController);
router.post('/refresh', refreshController);
router.post('/forgot-password', forgotPasswordController);
router.post('/reset-password/validate', validateResetTokenController);
router.post('/reset-password', resetPasswordController);

/**
 * Protected Authentication Routes
 */
router.post('/logout', authenticate, logoutController);
router.get('/me', authenticate, meController);
router.post('/change-password', authenticate, changePasswordController);

export default router;
