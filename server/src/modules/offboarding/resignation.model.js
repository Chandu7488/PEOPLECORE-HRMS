import mongoose from 'mongoose';

/**
 * Resignation Schema
 * Handles employee resignation submission, notice period lifecycle, and manager/HR review
 */
const ResignationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
      index: true,
    },
    resignationDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    proposedLastWorkingDay: {
      type: Date,
      required: [true, 'Proposed last working day is required'],
    },
    approvedLastWorkingDay: {
      type: Date,
      default: null,
    },
    noticePeriodDays: {
      type: Number,
      default: 30,
      min: 0,
    },
    reasonCategory: {
      type: String,
      enum: [
        'CAREER_GROWTH',
        'HIGHER_STUDIES',
        'PERSONAL_REASONS',
        'RELOCATION',
        'BETTER_COMPENSATION',
        'HEALTH',
        'OTHER',
      ],
      default: 'CAREER_GROWTH',
    },
    reasonDetails: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
      default: 'SUBMITTED',
      index: true,
    },
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approverNotes: {
      type: String,
      trim: true,
      default: '',
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    settlementStatus: {
      type: String,
      enum: ['PENDING', 'TASKS_IN_PROGRESS', 'CLEARED', 'SETTLED'],
      default: 'PENDING',
      index: true,
    },
    settlementSummary: {
      noticeShortfallDays: { type: Number, default: 0 },
      encashableLeaveDays: { type: Number, default: 0 },
      payableDays: { type: Number, default: 0 },
      settlementAmount: { type: Number, default: 0 },
      settledAt: { type: Date, default: null },
      remarks: { type: String, default: '' },
    },
    handoverNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Resignation = mongoose.model('Resignation', ResignationSchema);
