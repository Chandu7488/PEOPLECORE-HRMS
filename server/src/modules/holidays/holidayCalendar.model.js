import mongoose from 'mongoose';

/**
 * Holiday Calendar Schema
 * Represents versioned annual company calendars per Section 4.18
 */
const HolidayCalendarSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Calendar name is required'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      index: true,
    },
    yearType: {
      type: String,
      enum: ['CALENDAR', 'FISCAL'],
      default: 'CALENDAR',
    },
    startDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    endDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    sourceDocument: {
      fileName: { type: String },
      originalName: { type: String },
      mimeType: { type: String },
      size: { type: Number },
      path: { type: String },
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
HolidayCalendarSchema.index({ organizationId: 1, year: 1, status: 1 });

export const HolidayCalendar = mongoose.model('HolidayCalendar', HolidayCalendarSchema);
