import mongoose from 'mongoose';

/**
 * Salary Component Schema
 * Defines earnings, statutory deductions, and employer contributions
 */
const salaryComponentSchema = new mongoose.Schema(
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
    calculationType: {
      type: String,
      required: true,
      enum: ['PERCENTAGE_OF_BASIC', 'PERCENTAGE_OF_CTC', 'FIXED', 'SLAB'],
      default: 'PERCENTAGE_OF_BASIC',
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    isTaxable: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * Salary Structure Schema
 * Defines organizational compensation blueprints per Section 4.8 of documentation
 */
const salaryStructureSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    components: [salaryComponentSchema],
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

salaryStructureSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const SalaryStructure = mongoose.model('SalaryStructure', salaryStructureSchema);
