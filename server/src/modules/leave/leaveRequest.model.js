import mongoose from 'mongoose';

/**
 * LeaveRequest Schema
 * Represents employee leave applications, approval lifecycle, and holiday calendar consumption
 */
const LeaveRequestSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: true,
      index: true,
    },
    startDate: {
      type: String, // YYYY-MM-DD
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
      index: true,
    },
    endDate: {
      type: String, // YYYY-MM-DD
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
      index: true,
    },
    isHalfDay: {
      type: Boolean,
      default: false,
    },
    halfDaySession: {
      type: String,
      enum: ['FIRST_HALF', 'SECOND_HALF', null],
      default: null,
    },
    // Raw calendar days between startDate and endDate
    calendarDays: {
      type: Number,
      required: true,
      min: 0.5,
    },
    // Actual business days charged after skipping weekly-offs and published holidays
    deductedDays: {
      type: Number,
      required: true,
      min: 0,
    },
    // Breakdown of dates that were excluded due to holidays or weekends
    breakdown: [
      {
        date: String,
        status: {
          type: String,
          enum: ['CHARGED', 'WEEKLY_OFF', 'COMPANY_HOLIDAY'],
        },
        holidayName: { type: String, default: null },
      },
    ],
    reason: {
      type: String,
      required: [true, 'Reason for leave is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    decisionAt: {
      type: Date,
      default: null,
    },
    decisionNotes: {
      type: String,
      default: '',
      trim: true,
    },
    holidayCalendarVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

LeaveRequestSchema.index({ employeeId: 1, startDate: 1, endDate: 1 });

export const LeaveRequest = mongoose.model('LeaveRequest', LeaveRequestSchema);
