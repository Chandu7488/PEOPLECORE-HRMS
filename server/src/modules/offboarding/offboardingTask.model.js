import mongoose from 'mongoose';

/**
 * Offboarding Clearance Task Schema
 * Represents departmental exit checklist items (IT, Finance, HR, Admin, Security) per Section 4.14 & 17
 */
const OffboardingTaskSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    resignationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resignation',
      required: [true, 'Resignation reference is required'],
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
      index: true,
    },
    category: {
      type: String,
      enum: ['IT_ASSETS', 'FINANCE_SETTLEMENT', 'HR_EXIT_INTERVIEW', 'ADMIN_FACILITY', 'ACCESS_REVOCATION'],
      required: [true, 'Clearance category is required'],
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'CLEARED', 'WAIVED'],
      default: 'PENDING',
      index: true,
    },
    clearedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    clearedAt: {
      type: Date,
      default: null,
    },
    remarks: {
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

export const OffboardingTask = mongoose.model('OffboardingTask', OffboardingTaskSchema);
