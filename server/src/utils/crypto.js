import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt with 12 salt rounds
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} Password hash
 */
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

/**
 * Compares candidate password with stored hash
 * @param {string} candidatePassword - Plaintext candidate
 * @param {string} storedHash - Stored bcrypt hash
 * @returns {Promise<boolean>} True if match
 */
export const comparePassword = async (candidatePassword, storedHash) => {
  if (!candidatePassword || !storedHash) return false;
  return await bcrypt.compare(candidatePassword, storedHash);
};

/**
 * Generates a cryptographically secure URL-safe random token
 * @param {number} bytes - Number of random bytes (default 32)
 * @returns {string} Hex encoded token string
 */
export const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Computes SHA-256 hash of a token for secure database storage
 * @param {string} token - Raw token string
 * @returns {string} Hex encoded SHA-256 digest
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Validates password strength against PeopleCore security policy
 * Policy: At least 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol.
 * @param {string} password - Candidate password
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validatePasswordPolicy = (password) => {
  const errors = [];
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
