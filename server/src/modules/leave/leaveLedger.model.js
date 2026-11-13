import mongoose from 'mongoose';

/**
 * LeaveLedger Schema
 * Immutable double-entry audit trail for all leave balance transactions per Section 4.6
 * "Every balance change must have an auditable ledger transaction."
 */
const LeaveLedgerSchema = new mongoose.Schema(
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
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: [
        'OPENING_GRANT', // Initial annual quota credited
        'MONTHLY_ACCRUAL', // Periodic earned leave credit
        'REQUEST_DEBIT', // Leave taken and approved
        'REQUEST_CANCEL_CREDIT', // Reversal due to approved request cancellation
        'ADMIN_ADJUSTMENT', // HR manual balance correction
        'YEAR_END_LAPSE', // Unused quota lapsed at year end
        'CARRY_FORWARD', // Carried forward from previous year
        'ENCASHMENT', // Encashment payout deduction
      ],
      required: true,
      index: true,
    },
    // Amount can be positive (credit) or negative (debit)
    amount: {
      type: Number,
      required: true,
    },
    // Running balance snapshot after this transaction was applied
    balanceAfter: {
      type: Number,
      required: true,
    },
    // Optional reference to the leave request that triggered this ledger row
    leaveRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveRequest',
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

LeaveLedgerSchema.index({ employeeId: 1, leaveTypeId: 1, year: 1, createdAt: -1 });

export const LeaveLedger = mongoose.model('LeaveLedger', LeaveLedgerSchema);
