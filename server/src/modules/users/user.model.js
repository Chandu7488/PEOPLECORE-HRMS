import mongoose from 'mongoose';
import { ROLES } from '../../config/roles.js';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Prevents accidental leakage in queries and API responses
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    roles: {
      type: [String],
      enum: Object.values(ROLES),
      default: [ROLES.EMPLOYEE],
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'INVITED', 'TERMINATED'],
      default: 'ACTIVE',
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    failedLoginCount: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    tokenVersion: {
      type: Number,
      default: 0, // Incremented to invalidate all existing refresh tokens
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    mfa: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, select: false },
      recoveryCodes: { type: [String], select: false },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Checks whether user account is currently locked due to excessive failed attempts
 * @returns {boolean} True if locked
 */
UserSchema.methods.isLocked = function () {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

/**
 * Increments failed login count and locks account for 15 minutes after 5 failures
 */
UserSchema.methods.incrementFailedLogin = async function () {
  this.failedLoginCount = (this.failedLoginCount || 0) + 1;
  if (this.failedLoginCount >= 5) {
    this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lock
  }
  return await this.save();
};

/**
 * Resets failed login counters upon successful authentication
 */
UserSchema.methods.resetFailedLogin = async function () {
  if (this.failedLoginCount > 0 || this.lockedUntil) {
    this.failedLoginCount = 0;
    this.lockedUntil = null;
    return await this.save();
  }
};

export const User = mongoose.model('User', UserSchema);
