import mongoose from 'mongoose';

/**
 * Holiday Schema
 * Represents individual holidays inside a calendar per Section 4.18
 */
const HolidaySchema = new mongoose.Schema(
  {
    calendarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HolidayCalendar',
      required: true,
      index: true,
    },
    localDate: {
      type: String, // YYYY-MM-DD
      required: [true, 'Local date (YYYY-MM-DD) is required'],
      index: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    name: {
      type: String,
      required: [true, 'Holiday name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['NATIONAL', 'FESTIVAL', 'OPTIONAL', 'COMPANY', 'FLOATER'],
      default: 'NATIONAL',
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
    isHalfDay: {
      type: Boolean,
      default: false,
    },
    scopeType: {
      type: String,
      enum: ['ALL', 'LOCATION', 'DEPARTMENT'],
      default: 'ALL',
    },
    scopeTargetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate holiday dates within the same calendar and scope
HolidaySchema.index({ calendarId: 1, localDate: 1, scopeType: 1, scopeTargetId: 1 }, { unique: true });

export const Holiday = mongoose.model('Holiday', HolidaySchema);
