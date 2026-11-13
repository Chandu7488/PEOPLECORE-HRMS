import mongoose from 'mongoose';

/**
 * Payslip Earnings Line Schema
 */
const payslipEarningSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    earnedAmount: {
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
 * Payslip Deductions Line Schema
 */
const payslipDeductionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

/**
 * Payslip Employer Contributions Line Schema
 */
const payslipContributionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

/**
 * Payslip Schema
 * Represents employee monthly payslip with attendance snapshot, line-by-line earnings, deductions, and net pay
 */
const payslipSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    payrollRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollRun',
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeSnapshot: {
      employeeCode: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String },
      department: { type: String },
      designation: { type: String },
      dateOfJoining: { type: Date },
      bankName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      pan: { type: String },
      pfUan: { type: String },
    },
    period: {
      year: { type: Number, required: true },
      month: { type: Number, required: true },
      periodString: { type: String, required: true }, // e.g. "January 2026"
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      payoutDate: { type: Date, required: true },
    },
    attendanceSnapshot: {
      totalDays: { type: Number, required: true },
      workingDays: { type: Number, required: true },
      presentDays: { type: Number, default: 0 },
      paidLeaveDays: { type: Number, default: 0 },
      holidays: { type: Number, default: 0 },
      weeklyOffs: { type: Number, default: 0 },
      unpaidLeaveDays: { type: Number, default: 0 }, // LWP
      payableDays: { type: Number, required: true },
    },
    earnings: [payslipEarningSchema],
    deductions: [payslipDeductionSchema],
    employerContributions: [payslipContributionSchema],
    grossEarnings: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDeductions: {
      type: Number,
      required: true,
      min: 0,
    },
    netPay: {
      type: Number,
      required: true,
      min: 0,
    },
    netPayInWords: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'FINALIZED', 'PUBLISHED'],
      default: 'DRAFT',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

payslipSchema.index({ organizationId: 1, payrollRunId: 1, employeeId: 1 }, { unique: true });

export const Payslip = mongoose.model('Payslip', payslipSchema);
