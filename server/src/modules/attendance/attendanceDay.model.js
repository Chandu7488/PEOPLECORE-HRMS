import mongoose from 'mongoose';

/**
 * AttendanceDay Schema
 * Daily derived attendance summary per Section 4.5
 * Consumes raw punches, shifts, approved leaves, and published holidays
 */
const AttendanceDaySchema = new mongoose.Schema(
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
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      default: null,
    },
    firstIn: {
      type: Date,
      default: null,
    },
    lastOut: {
      type: Date,
      default: null,
    },
    totalWorkMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBreakMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        'PRESENT',
        'ABSENT',
        'HALF_DAY',
        'LATE',
        'LEAVE',
        'WEEKLY_OFF',
        'HOLIDAY',
        'ON_DUTY',
        'MISSED_PUNCH',
        'REGULARIZED',
      ],
      default: 'ABSENT',
      index: true,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    lateMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    isOvertime: {
      type: Boolean,
      default: false,
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    holidayName: {
      type: String,
      default: null,
    },
    leaveRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveRequest',
      default: null,
    },
    holidayCalendarVersion: {
      type: Number,
      default: 1,
    },
    calculationVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

AttendanceDaySchema.index({ organizationId: 1, employeeId: 1, date: 1 }, { unique: true });

export const AttendanceDay = mongoose.model('AttendanceDay', AttendanceDaySchema);
