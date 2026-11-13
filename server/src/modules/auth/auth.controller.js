import { authService } from './auth.service.js';
import { ENV } from '../../config/env.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: ENV.COOKIE_SECURE,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const loginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(email, password, ip, userAgent);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        permissions: result.permissions,
      },
      message: 'Logged in successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const refreshController = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    const result = await authService.refreshAccessToken(rawRefreshToken);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Session refreshed successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const logoutController = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    await authService.logout(userId, ip, userAgent);

    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: null,
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const meController = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
        permissions: req.userPermissions,
      },
      message: 'Profile retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const forgotPasswordController = async (req, res, next) => {
  try {
    const { email } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.requestPasswordReset(email, ip, userAgent);

    res.status(200).json({
      success: true,
      data: null,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

export const validateResetTokenController = async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await authService.validateResetToken(token);

    res.status(200).json({
      success: result.valid,
      data: { valid: result.valid, email: result.email, name: result.name },
      message: result.message || 'Token is valid',
    });
  } catch (err) {
    next(err);
  }
};

export const resetPasswordController = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.resetPassword(token, newPassword, ip, userAgent);

    res.status(200).json({
      success: true,
      data: { email: result.email, name: result.name },
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

export const changePasswordController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.changePassword(userId, currentPassword, newPassword, ip, userAgent);

    res.status(200).json({
      success: true,
      data: null,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};
