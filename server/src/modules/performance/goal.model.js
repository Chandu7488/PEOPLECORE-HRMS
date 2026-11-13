import mongoose from 'mongoose';

/**
 * Goal & OKR Schema for Performance Management (PMS)
 */
const GoalSchema = new mongoose.Schema(
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
      required: [true, 'Employee reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['PROJECT', 'TECHNICAL', 'LEADERSHIP', 'INNOVATION', 'COMPANY_GOAL'],
      default: 'PROJECT',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    targetDate: {
      type: Date,
      default: null,
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    weightage: {
      type: Number,
      default: 25,
      min: 1,
      max: 100,
    },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'],
      default: 'IN_PROGRESS',
      index: true,
    },
    selfRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    managerRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    managerFeedback: {
      type: String,
      trim: true,
      default: '',
    },
    year: {
      type: Number,
      default: 2026,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Goal = mongoose.model('Goal', GoalSchema);
