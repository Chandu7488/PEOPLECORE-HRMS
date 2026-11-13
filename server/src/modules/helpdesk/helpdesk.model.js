import mongoose from 'mongoose';

/**
 * Helpdesk Support Ticket Schema
 */
const HelpdeskTicketSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    ticketNumber: {
      type: String,
      required: [true, 'Ticket number is required'],
      uppercase: true,
      trim: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
      index: true,
    },
    category: {
      type: String,
      enum: ['IT_SUPPORT', 'HR_POLICY', 'PAYROLL_ISSUE', 'FACILITY', 'GENERAL'],
      default: 'IT_SUPPORT',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    subject: {
      type: String,
      required: [true, 'Ticket subject is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Ticket description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolutionNotes: {
      type: String,
      trim: true,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

HelpdeskTicketSchema.index({ organizationId: 1, ticketNumber: 1 }, { unique: true });

export const HelpdeskTicket = mongoose.model('HelpdeskTicket', HelpdeskTicketSchema);
