import mongoose from 'mongoose';

/**
 * Shift Template Schema
 * Defines work hours, breaks, grace period, and overtime policies per Section 4.5 & 4.7
 */
const ShiftSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String, // HH:mm format, e.g. "09:00"
      required: true,
    },
    endTime: {
      type: String, // HH:mm format, e.g. "18:00"
      required: true,
    },
    isNightShift: {
      type: Boolean,
      default: false,
    },
    graceMinutes: {
      type: Number,
      default: 15,
      min: 0,
    },
    halfDayMinutes: {
      type: Number,
      default: 240, // 4 hours
    },
    fullDayMinutes: {
      type: Number,
      default: 480, // 8 hours net
    },
    breakMinutes: {
      type: Number,
      default: 60, // 1 hour lunch
    },
    workDays: {
      type: [String],
      enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
      default: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    },
    workMode: {
      type: String,
      enum: ['OFFICE', 'REMOTE', 'HYBRID'],
      default: 'OFFICE',
    },
    isDefault: {
      type: Boolean,
      default: false,
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

ShiftSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const Shift = mongoose.model('Shift', ShiftSchema);
