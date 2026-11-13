import mongoose from 'mongoose';

/**
 * Expense Reimbursement Claim Schema
 */
const ExpenseClaimSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    claimNumber: {
      type: String,
      required: [true, 'Claim number is required'],
      uppercase: true,
      trim: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['TRAVEL', 'FOOD', 'ACCOMMODATION', 'SUPPLIES', 'TRAINING', 'INTERNET', 'OTHER'],
      default: 'TRAVEL',
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    expenseDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    receiptUrl: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED'],
      default: 'SUBMITTED',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
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

ExpenseClaimSchema.index({ organizationId: 1, claimNumber: 1 }, { unique: true });

export const ExpenseClaim = mongoose.model('ExpenseClaim', ExpenseClaimSchema);
