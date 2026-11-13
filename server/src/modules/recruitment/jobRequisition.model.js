import mongoose from 'mongoose';

/**
 * Job Requisition Schema
 * Represents an open position or headcount approval per Section 4.1 & 11
 */
const JobRequisitionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    requisitionCode: {
      type: String,
      required: [true, 'Requisition code is required'],
      uppercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
      index: true,
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
    employmentType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
      default: 'FULL_TIME',
    },
    openingsCount: {
      type: Number,
      default: 1,
      min: [1, 'Openings count must be at least 1'],
    },
    filledCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    experienceMin: {
      type: Number,
      default: 0,
    },
    experienceMax: {
      type: Number,
      default: 5,
    },
    budgetMin: {
      type: Number,
      default: 0,
    },
    budgetMax: {
      type: Number,
      default: 0,
    },
    hiringManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'OPEN', 'ON_HOLD', 'FILLED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    targetDate: {
      type: Date,
      default: null,
    },
    jobDescription: {
      type: String,
      trim: true,
      default: '',
    },
    skills: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Unique requisition code per organization
JobRequisitionSchema.index({ organizationId: 1, requisitionCode: 1 }, { unique: true });

export const JobRequisition = mongoose.model('JobRequisition', JobRequisitionSchema);
