import mongoose from 'mongoose';

/**
 * AttendancePunch Schema
 * Idempotent punch ingestion stream per Section 4.5
 * "Keep raw punch events separate from derived attendance-day summaries; calculations must be idempotent."
 */
const AttendancePunchSchema = new mongoose.Schema(
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
    punchTime: {
      type: Date,
      required: true,
      index: true,
    },
    // Extracted local date string YYYY-MM-DD for fast grouping
    localDate: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['IN', 'OUT'],
      required: true,
    },
    source: {
      type: String,
      enum: ['WEB', 'MOBILE', 'BIOMETRIC', 'ADMIN'],
      default: 'WEB',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

AttendancePunchSchema.index({ employeeId: 1, localDate: 1, punchTime: 1 });

export const AttendancePunch = mongoose.model('AttendancePunch', AttendancePunchSchema);
