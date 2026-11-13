import mongoose from 'mongoose';

/**
 * LeaveType Schema
 * Represents configurable leave policies per Section 4.6
 */
const LeaveTypeSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Leave code is required (e.g. CL, SL, EL)'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Leave type name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      enum: ['EARNED', 'CASUAL', 'SICK', 'UNPAID', 'COMPENSATORY', 'MATERNITY', 'PATERNITY', 'SPECIAL'],
      default: 'CASUAL',
    },
    annualQuota: {
      type: Number,
      required: true,
      min: [0, 'Quota cannot be negative'],
      default: 12,
    },
    accrualFrequency: {
      type: String,
      enum: ['ANNUAL', 'MONTHLY', 'QUARTERLY', 'NONE'],
      default: 'ANNUAL',
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
    carryForwardLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    requiresAttachment: {
      type: Boolean,
      default: false,
    },
    minNoticeDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    allowNegative: {
      type: Boolean,
      default: false,
    },
    maxNegativeDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    applicableGenders: {
      type: [String],
      enum: ['MALE', 'FEMALE', 'OTHER', 'ALL'],
      default: ['ALL'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee unique leave code within organization
LeaveTypeSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const LeaveType = mongoose.model('LeaveType', LeaveTypeSchema);
