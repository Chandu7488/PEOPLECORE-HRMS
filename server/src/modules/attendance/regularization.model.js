import mongoose from 'mongoose';

/**
 * AttendanceRegularization Schema
 * Missed punch and late arrival correction workflow per Section 4.5
 */
const AttendanceRegularizationSchema = new mongoose.Schema(
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
    attendanceDayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceDay',
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    requestedCheckIn: {
      type: String, // HH:mm format, e.g. "09:05"
      default: null,
    },
    requestedCheckOut: {
      type: String, // HH:mm format, e.g. "18:10"
      default: null,
    },
    reason: {
      type: String,
      required: [true, 'Reason for regularization is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
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
    },
  },
  {
    timestamps: true,
  }
);

export const AttendanceRegularization = mongoose.model(
  'AttendanceRegularization',
  AttendanceRegularizationSchema
);
