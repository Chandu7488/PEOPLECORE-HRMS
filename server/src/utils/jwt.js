import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

/**
 * Generates an Access Token with short lifetime (default 15m)
 * @param {object} user - User document or payload object
 * @returns {string} Signed JWT
 */
export const signAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
      tokenVersion: user.tokenVersion || 0,
    },
    ENV.JWT_ACCESS_SECRET,
    { expiresIn: ENV.JWT_ACCESS_EXPIRES_IN }
  );
};

/**
 * Generates a Refresh Token with longer lifetime (default 7d)
 * @param {object} user - User document or payload object
 * @returns {string} Signed JWT
 */
export const signRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      tokenVersion: user.tokenVersion || 0,
    },
    ENV.JWT_REFRESH_SECRET,
    { expiresIn: ENV.JWT_REFRESH_EXPIRES_IN }
  );
};

/**
 * Verifies an Access Token
 * @param {string} token - JWT Access token
 * @returns {object} Decoded payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET);
};

/**
 * Verifies a Refresh Token
 * @param {string} token - JWT Refresh token
 * @returns {object} Decoded payload
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET);
};
