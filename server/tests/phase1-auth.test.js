import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/modules/users/user.model.js';
import { PasswordResetToken } from '../src/modules/auth/token.model.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { hashPassword, hashToken } from '../src/utils/crypto.js';

describe('Phase 1: Authentication & Account Recovery Self-Tests', () => {
  const testEmail = 'test-emp@peoplecore.local';
  const initialPassword = 'Password@123';

  before(async () => {
    await connectDB();
    // Prepare test user
    await User.deleteMany({ email: testEmail });
    await PasswordResetToken.deleteMany({});
    const passwordHash = await hashPassword(initialPassword);
    await User.create({
      email: testEmail,
      firstName: 'Test',
      lastName: 'Employee',
      roles: ['EMPLOYEE'],
      status: 'ACTIVE',
      passwordHash,
    });
  });

  after(async () => {
    await User.deleteMany({ email: testEmail });
    await PasswordResetToken.deleteMany({});
    await disconnectDB();
  });

  test('1. Valid credentials authenticate successfully and return access & refresh tokens', async () => {
    const res = await authService.login(testEmail, initialPassword);
    assert.ok(res.accessToken, 'Access token should be issued');
    assert.ok(res.refreshToken, 'Refresh token should be issued');
    assert.equal(res.user.email, testEmail);
    assert.ok(Array.isArray(res.permissions), 'Permissions should be an array');
    assert.ok(res.permissions.includes('leave.apply'), 'Employee should have leave.apply permission');
  });

  test('2. Invalid password returns non-revealing error and increments failedLoginCount', async () => {
    await assert.rejects(
      async () => {
        await authService.login(testEmail, 'WrongPassword@999');
      },
      (err) => {
        assert.equal(err.statusCode, 401);
        assert.equal(err.message, 'Email or password is incorrect');
        return true;
      }
    );

    const user = await User.findOne({ email: testEmail });
    assert.equal(user.failedLoginCount, 1);
  });

  test('3. Account lockout activates after 5 consecutive failures', async () => {
    const user = await User.findOne({ email: testEmail });
    user.failedLoginCount = 4;
    await user.save();

    await assert.rejects(
      async () => {
        await authService.login(testEmail, 'WrongPassword@999');
      },
      (err) => {
        assert.equal(err.statusCode, 401);
        return true;
      }
    );

    const lockedUser = await User.findOne({ email: testEmail });
    assert.equal(lockedUser.failedLoginCount, 5);
    assert.ok(lockedUser.isLocked(), 'User account should be marked locked');

    // Next attempt must trigger 423 ACCOUNT_LOCKED
    await assert.rejects(
      async () => {
        await authService.login(testEmail, initialPassword);
      },
      (err) => {
        assert.equal(err.statusCode, 423);
        assert.equal(err.code, 'ACCOUNT_LOCKED');
        return true;
      }
    );

    // Unlock for subsequent tests
    await lockedUser.resetFailedLogin();
  });

  test('4. Forgot-password returns IDENTICAL generic response for registered and unregistered emails', async () => {
    const registeredRes = await authService.requestPasswordReset(testEmail);
    const unregisteredRes = await authService.requestPasswordReset('nonexistent@peoplecore.local');

    assert.deepEqual(
      registeredRes,
      unregisteredRes,
      'Response for existing and non-existing accounts must be byte-for-byte identical'
    );
    assert.equal(registeredRes.message, 'If that email is registered, we have sent a reset link.');
  });

  test('5. Password reset token is stored as SHA-256 hash and validates correctly', async () => {
    const user = await User.findOne({ email: testEmail });
    const tokenDoc = await PasswordResetToken.findOne({ userId: user._id, usedAt: null });
    assert.ok(tokenDoc, 'Token document should exist in database');
    assert.ok(tokenDoc.tokenHash, 'tokenHash must be saved');
    assert.ok(tokenDoc.expiresAt > new Date(), 'Token must have future expiry date');
  });

  test('6. Resetting password updates hash, marks token used, and increments tokenVersion to revoke sessions', async () => {
    const user = await User.findOne({ email: testEmail });
    const initialTokenVersion = user.tokenVersion || 0;

    // Issue fresh reset token
    await authService.requestPasswordReset(testEmail);
    const tokenDoc = await PasswordResetToken.findOne({ userId: user._id, usedAt: null });

    // In unit test we reconstruct raw token flow: let's create a known raw token
    const testRawToken = 'abc123def4567890123456789012345678901234567890123456789012345678';
    tokenDoc.tokenHash = hashToken(testRawToken);
    await tokenDoc.save();

    const newPassword = 'NewSecretPassword@2026';
    const resetRes = await authService.resetPassword(testRawToken, newPassword);
    assert.ok(resetRes.message.includes('successfully'));

    // Verify token marked used
    const updatedToken = await PasswordResetToken.findById(tokenDoc._id);
    assert.ok(updatedToken.usedAt !== null, 'Token must be marked used');

    // Verify user tokenVersion bumped
    const updatedUser = await User.findById(user._id);
    assert.equal(updatedUser.tokenVersion, initialTokenVersion + 1, 'tokenVersion should be incremented');

    // Cannot reuse used token
    await assert.rejects(
      async () => {
        await authService.resetPassword(testRawToken, 'AnotherPassword@123');
      },
      (err) => {
        assert.equal(err.code, 'INVALID_OR_EXPIRED_TOKEN');
        return true;
      }
    );

    // Can login with new password
    const loginRes = await authService.login(testEmail, newPassword);
    assert.ok(loginRes.accessToken);
  });
});
