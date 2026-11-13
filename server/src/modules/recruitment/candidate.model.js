import mongoose from 'mongoose';

/**
 * Candidate Schema
 * Represents applicant lifecycle in the recruitment ATS pipeline per Section 4.1 & 11
 */
const CandidateSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    requisitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobRequisition',
      required: [true, 'Job requisition reference is required'],
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Candidate email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    totalExperience: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentCompany: {
      type: String,
      trim: true,
      default: '',
    },
    currentCtc: {
      type: Number,
      default: 0,
    },
    expectedCtc: {
      type: Number,
      default: 0,
    },
    noticePeriodDays: {
      type: Number,
      default: 30,
    },
    resumeUrl: {
      type: String,
      trim: true,
      default: '',
    },
    portfolioUrl: {
      type: String,
      trim: true,
      default: '',
    },
    stage: {
      type: String,
      enum: ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED'],
      default: 'APPLIED',
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    evaluations: [
      {
        stage: { type: String, default: 'INTERVIEW' },
        evaluatorName: { type: String, default: '' },
        score: { type: Number, min: 1, max: 5 },
        feedback: { type: String, trim: true },
        evaluatedAt: { type: Date, default: Date.now },
      },
    ],
    offerDetails: {
      offeredCtc: { type: Number, default: 0 },
      joiningDate: { type: Date, default: null },
      notes: { type: String, default: '' },
      offeredAt: { type: Date, default: null },
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    convertedEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    convertedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    source: {
      type: String,
      enum: ['PORTAL', 'LINKEDIN', 'REFERRAL', 'AGENCY', 'DIRECT'],
      default: 'PORTAL',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for candidate full name
CandidateSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure a candidate cannot be duplicated for the exact same job requisition
CandidateSchema.index({ requisitionId: 1, email: 1 }, { unique: true });

export const Candidate = mongoose.model('Candidate', CandidateSchema);
