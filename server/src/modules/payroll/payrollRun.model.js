import mongoose from 'mongoose';

/**
 * Payroll Run Schema
 * Implements Section 4.8 & Section 11 of PeopleCore Master Project Documentation:
 * Lifecycle: DRAFT -> INPUTS_COLLECTED -> CALCULATED -> REVIEW -> APPROVED -> LOCKED -> PAID
 * Maker-checker approval tracking and immutable locked state
 */
const payrollRunSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    period: {
      type: String, // e.g. "2026-01"
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    payoutDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'INPUTS_COLLECTED', 'CALCULATED', 'REVIEW', 'APPROVED', 'LOCKED', 'PAID'],
      default: 'DRAFT',
      index: true,
    },
    ruleVersion: {
      type: String,
      default: 'v2026.1-IN-STATUTORY',
    },
    totals: {
      totalEmployees: {
        type: Number,
        default: 0,
      },
      totalGrossPay: {
        type: Number,
        default: 0,
      },
      totalDeductions: {
        type: Number,
        default: 0,
      },
      totalNetPay: {
        type: Number,
        default: 0,
      },
      totalEmployerContributions: {
        type: Number,
        default: 0,
      },
    },
    // Maker-checker audit tracking
    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    preparedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lockedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    publishedPayslips: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

payrollRunSchema.index({ organizationId: 1, period: 1 }, { unique: true });

export const PayrollRun = mongoose.model('PayrollRun', payrollRunSchema);
