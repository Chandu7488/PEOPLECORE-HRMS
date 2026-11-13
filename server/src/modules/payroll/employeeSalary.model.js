import mongoose from 'mongoose';

/**
 * Individual Component Allocation Schema
 */
const allocatedComponentSchema = new mongoose.Schema(
  {
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
    type: {
      type: String,
      required: true,
      enum: ['EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION'],
    },
    monthlyAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    annualAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    isTaxable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

/**
 * Salary Revision History Schema
 */
const salaryRevisionSchema = new mongoose.Schema(
  {
    revisedAt: {
      type: Date,
      default: Date.now,
    },
    revisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    previousCtc: {
      type: Number,
      required: true,
    },
    newCtc: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * Employee Salary Assignment Schema
 * Persists effective-dated compensation, statutory details, and breakdown per employee
 */
const employeeSalarySchema = new mongoose.Schema(
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
    salaryStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryStructure',
    },
    annualCtc: {
      type: Number,
      required: true,
      min: 0,
    },
    monthlyGross: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    components: [allocatedComponentSchema],
    paymentDetails: {
      bankName: {
        type: String,
        trim: true,
        default: 'HDFC Bank',
      },
      accountNumber: {
        type: String,
        trim: true,
        default: '50100458921456',
      },
      ifscCode: {
        type: String,
        trim: true,
        uppercase: true,
        default: 'HDFC0000123',
      },
      pan: {
        type: String,
        trim: true,
        uppercase: true,
        default: 'ABCDE1234F',
      },
      pfUan: {
        type: String,
        trim: true,
        default: '101234567890',
      },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUPERSEDED', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    revisions: [salaryRevisionSchema],
  },
  {
    timestamps: true,
  }
);

employeeSalarySchema.index({ organizationId: 1, employeeId: 1, status: 1 });

export const EmployeeSalary = mongoose.model('EmployeeSalary', employeeSalarySchema);
