import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../modules/users/user.model.js';
import { getPermissionsForRoles } from '../config/roles.js';

/**
 * Middleware: Authenticates request using Bearer JWT access token
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token missing or invalid',
          details: [],
        },
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: jwtError.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token.',
          details: [],
        },
      });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Account no longer exists',
          details: [],
        },
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: `Account is ${user.status.toLowerCase()}. Please contact HR administrator.`,
          details: [],
        },
      });
    }

    // Verify tokenVersion hasn't been invalidated (e.g. through password reset / logout)
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_REVOKED',
          message: 'Session has been invalidated. Please sign in again.',
          details: [],
        },
      });
    }

    req.user = user;
    req.userPermissions = getPermissionsForRoles(user.roles);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Role-Based Access Control guard
 * @param  {...string} allowedRoles - List of allowed roles
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          details: [],
        },
      });
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action',
          details: [],
        },
      });
    }

    next();
  };
};

/**
 * Middleware: Granular permission code guard
 * @param {string} permission - Required permission code
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.userPermissions || !req.userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Missing required permission: ${permission}`,
          details: [],
        },
      });
    }
    next();
  };
};
