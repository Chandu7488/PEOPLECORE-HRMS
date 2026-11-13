import { User } from '../users/user.model.js';
import { PasswordResetToken } from './token.model.js';
import {
  hashPassword,
  comparePassword,
  generateRandomToken,
  hashToken,
  validatePasswordPolicy,
} from '../../utils/crypto.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { emailService } from '../../utils/emailService.js';
import { recordAuditLog } from '../audit/audit.model.js';
import { getPermissionsForRoles } from '../../config/roles.js';

/**
 * Authentication & Account Recovery Service
 * Implements authentication flows and security controls matching Section 7.1
 */
export class AuthService {
  /**
   * Authenticates user credentials with lockout protection
   * @param {string} email - Work email
   * @param {string} password - Plaintext password
   * @param {string} ip - Client IP address
   * @param {string} userAgent - User agent string
   * @returns {Promise<{ user: object, accessToken: string, refreshToken: string, permissions: string[] }>}
   */
  async login(email, password, ip = null, userAgent = null) {
    const normalizedEmail = (email || '').toLowerCase().trim();

    if (!normalizedEmail || !password) {
      throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Email and password are required' };
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      await recordAuditLog({
        action: 'AUTH_LOGIN_FAILED',
        actorEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        status: 'FAILURE',
        metadata: { reason: 'User not found' },
      });
      // Generic non-revealing error
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' };
    }

    // Check account lockout
    if (user.isLocked()) {
      const minutesRemaining = Math.ceil((user.lockedUntil - Date.now()) / (60 * 1000));
      await recordAuditLog({
        action: 'AUTH_LOGIN_LOCKED',
        actorId: user._id,
        actorEmail: user.email,
        ipAddress: ip,
        userAgent,
        status: 'FAILURE',
        metadata: { minutesRemaining },
      });
      throw {
        statusCode: 423,
        code: 'ACCOUNT_LOCKED',
        message: `Account is temporarily locked due to excessive failed attempts. Please try again in ${minutesRemaining} minutes or contact your HR administrator.`,
      };
    }

    // Verify password
    const isMatch = await comparePassword(password, user.passwordHash);

    if (!isMatch) {
      await user.incrementFailedLogin();
      await recordAuditLog({
        action: 'AUTH_LOGIN_FAILED',
        actorId: user._id,
        actorEmail: user.email,
        ipAddress: ip,
        userAgent,
        status: 'FAILURE',
        metadata: { failedAttempts: user.failedLoginCount },
      });
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' };
    }

    // Check status
    if (user.status !== 'ACTIVE') {
      await recordAuditLog({
        action: 'AUTH_LOGIN_INACTIVE',
        actorId: user._id,
        actorEmail: user.email,
        ipAddress: ip,
        userAgent,
        status: 'FAILURE',
        metadata: { status: user.status },
      });
      throw {
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
        message: `Your account is ${user.status.toLowerCase()}. Please contact your HR administrator.`,
      };
    }

    // Reset failed login counter upon successful authentication
    await user.resetFailedLogin();

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await recordAuditLog({
      action: 'AUTH_LOGIN_SUCCESS',
      actorId: user._id,
      actorEmail: user.email,
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
    });

    const userObj = user.toJSON();
    const permissions = getPermissionsForRoles(user.roles);

    return {
      user: userObj,
      accessToken,
      refreshToken,
      permissions,
    };
  }

  /**
   * Refreshes access token using a valid refresh token cookie
   * @param {string} refreshToken - Raw refresh token from cookie
   */
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw { statusCode: 401, code: 'UNAUTHORIZED', message: 'Refresh token missing' };
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw { statusCode: 401, code: 'TOKEN_INVALID', message: 'Invalid or expired refresh token' };
    }

    const user = await User.findById(decoded.sub);
    if (!user || user.status !== 'ACTIVE') {
      throw { statusCode: 401, code: 'UNAUTHORIZED', message: 'User account is not accessible' };
    }

    // Ensure session has not been revoked
    if (decoded.tokenVersion !== user.tokenVersion) {
      throw { statusCode: 401, code: 'SESSION_REVOKED', message: 'Session has expired or was revoked' };
    }

    const newAccessToken = signAccessToken(user);
    const permissions = getPermissionsForRoles(user.roles);

    return {
      accessToken: newAccessToken,
      user: user.toJSON(),
      permissions,
    };
  }

  /**
   * Logs out user and records audit trail
   * @param {string} userId - User identifier
   * @param {string} ip - Request IP
   * @param {string} userAgent - User agent
   */
  async logout(userId, ip = null, userAgent = null) {
    if (userId) {
      await recordAuditLog({
        action: 'AUTH_LOGOUT',
        actorId: userId,
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
      });
    }
    return { success: true };
  }

  /**
   * Initiates forgot password request.
   * Mandate Section 7.1: Returns an IDENTICAL response regardless of whether
   * the email exists, does not exist, is suspended, or locked (prevents user enumeration).
   * @param {string} email - Email address
   * @param {string} ip - Requester IP
   * @param {string} userAgent - User agent
   */
  async requestPasswordReset(email, ip = null, userAgent = null) {
    const GENERIC_RESPONSE = {
      message: 'If that email is registered, we have sent a reset link.',
    };

    const normalizedEmail = (email || '').toLowerCase().trim();
    if (!normalizedEmail) {
      return GENERIC_RESPONSE;
    }

    const user = await User.findOne({ email: normalizedEmail });

    // Only issue token if user exists and is ACTIVE
    if (user && user.status === 'ACTIVE') {
      // Invalidate any previously unused reset tokens for this user
      await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });

      const rawToken = generateRandomToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes TTL

      await PasswordResetToken.create({
        userId: user._id,
        tokenHash,
        purpose: 'RESET',
        expiresAt,
        requestedIp: ip,
        userAgent,
      });

      await emailService.sendPasswordResetEmail(user.email, rawToken, 30);

      await recordAuditLog({
        action: 'AUTH_FORGOT_PASSWORD_REQUEST',
        actorId: user._id,
        actorEmail: user.email,
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
      });
    } else {
      // Record internal audit for security monitoring without leaking to caller
      await recordAuditLog({
        action: 'AUTH_FORGOT_PASSWORD_NON_EXISTENT',
        actorEmail: normalizedEmail,
        ipAddress: ip,
        userAgent,
        status: 'FAILURE',
        metadata: { reason: !user ? 'Email not registered' : `User status: ${user.status}` },
      });
    }

    return GENERIC_RESPONSE;
  }

  /**
   * Pre-validates reset token to ensure it exists, is not used, and has not expired
   * @param {string} rawToken - Token from URL
   */
  async validateResetToken(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') {
      return { valid: false, message: 'Reset token is invalid or has expired.' };
    }

    const tokenHash = hashToken(rawToken);
    let user = null;
    const tokenDoc = await PasswordResetToken.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (tokenDoc) {
      user = await User.findById(tokenDoc.userId).select('email firstName lastName');
    } else {
      user = await User.findOne({
        resetPasswordToken: tokenHash,
        resetPasswordExpiresAt: { $gt: new Date() },
      }).select('email firstName lastName');
    }

    if (!user) {
      return { valid: false, message: 'Reset token is invalid or has expired.' };
    }

    return {
      valid: true,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    };
  }

  /**
   * Resets password using valid token and revokes all active sessions
   * @param {string} rawToken - Token from URL query
   * @param {string} newPassword - New password adhering to policy
   * @param {string} ip - Client IP
   * @param {string} userAgent - User agent
   */
  async resetPassword(rawToken, newPassword, ip = null, userAgent = null) {
    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.valid) {
      throw {
        statusCode: 400,
        code: 'WEAK_PASSWORD',
        message: policyResult.errors[0],
        details: policyResult.errors,
      };
    }

    if (!rawToken) {
      throw { statusCode: 400, code: 'INVALID_TOKEN', message: 'Reset token is required' };
    }

    const tokenHash = hashToken(rawToken);
    const tokenDoc = await PasswordResetToken.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    let user = null;
    if (tokenDoc) {
      user = await User.findById(tokenDoc.userId);
    } else {
      user = await User.findOne({
        resetPasswordToken: tokenHash,
        resetPasswordExpiresAt: { $gt: new Date() },
      });
    }

    if (!user) {
      throw {
        statusCode: 400,
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Password reset link is invalid or has expired. Please request a new one.',
      };
    }

    // Update password hash and revoke all sessions by bumping tokenVersion
    const newHash = await hashPassword(newPassword);
    user.passwordHash = newHash;
    user.passwordChangedAt = new Date();
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidates all existing refresh tokens
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    user.resetPasswordToken = null;
    user.resetPasswordExpiresAt = null;
    await user.save();

    // Mark single-use token as used if doc exists
    if (tokenDoc) {
      tokenDoc.usedAt = new Date();
      await tokenDoc.save();
    }

    // Send confirmation email
    await emailService.sendPasswordChangedConfirmation(user.email);

    await recordAuditLog({
      action: 'AUTH_PASSWORD_RESET_SUCCESS',
      actorId: user._id,
      actorEmail: user.email,
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
    });

    return {
      success: true,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      message: 'Password has been set successfully. You may now sign in with your new password.',
    };
  }

  /**
   * Changes password for an authenticated user
   * @param {string} userId - Authenticated user ID
   * @param {string} currentPassword - Current plaintext password
   * @param {string} newPassword - New password
   * @param {string} ip - IP address
   * @param {string} userAgent - User agent
   */
  async changePassword(userId, currentPassword, newPassword, ip = null, userAgent = null) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 400, code: 'INCORRECT_PASSWORD', message: 'Current password is incorrect' };
    }

    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.valid) {
      throw {
        statusCode: 400,
        code: 'WEAK_PASSWORD',
        message: policyResult.errors[0],
        details: policyResult.errors,
      };
    }

    const newHash = await hashPassword(newPassword);
    user.passwordHash = newHash;
    user.passwordChangedAt = new Date();
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await emailService.sendPasswordChangedConfirmation(user.email);

    await recordAuditLog({
      action: 'AUTH_PASSWORD_CHANGED',
      actorId: user._id,
      actorEmail: user.email,
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
    });

    return { message: 'Password updated successfully. Other active sessions have been revoked.' };
  }
}

export const authService = new AuthService();
