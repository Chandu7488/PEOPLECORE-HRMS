import mongoose from 'mongoose';

/**
 * Employee Job History Schema
 * Maintains an immutable, effective-dated audit trail of job changes:
 * - Joining
 * - Promotions
 * - Department Transfers
 * - Manager Reassignments
 * - Location Changes
 * - Status Changes (Probation confirmation, Notice period, Resignation)
 */
const EmployeeJobHistorySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    changeType: {
      type: String,
      enum: [
        'JOINING',
        'PROMOTION',
        'TRANSFER',
        'MANAGER_CHANGE',
        'DEPARTMENT_CHANGE',
        'STATUS_CHANGE',
      ],
      required: true,
    },
    effectiveDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
      default: null,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    status: {
      type: String,
      default: 'ACTIVE',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'recordedAt', updatedAt: false }, // Immutable append-only record
  }
);

EmployeeJobHistorySchema.index({ employeeId: 1, effectiveDate: -1 });

export const EmployeeJobHistory = mongoose.model('EmployeeJobHistory', EmployeeJobHistorySchema);
