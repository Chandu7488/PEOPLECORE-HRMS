import mongoose from 'mongoose';

/**
 * Employee Schema
 * Represents the single authoritative employee record per Section 1 & 4.2
 */
const EmployeeSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    employeeCode: {
      type: String,
      required: [true, 'Employee code is required'],
      uppercase: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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
    workEmail: {
      type: String,
      required: [true, 'Work email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    personalEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
      default: 'PREFER_NOT_TO_SAY',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'SUSPENDED', 'TERMINATED'],
      default: 'ACTIVE',
      index: true,
    },
    employmentType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
      default: 'FULL_TIME',
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
      default: null,
      index: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
      index: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    documents: [
      {
        docType: {
          type: String,
          enum: [
            'RESUME',
            'ID_PROOF',
            'AADHAAR_CARD',
            'PAN_CARD',
            'PASSPORT',
            'DRIVING_LICENSE',
            'OFFER_LETTER',
            'EDUCATION_CERTIFICATE',
            'RELIEVING_LETTER',
            'EXPERIENCE_LETTER',
            'BANK_PASSBOOK',
            'OTHER',
          ],
          default: 'OTHER',
        },
        title: { type: String, required: true, trim: true },
        fileName: { type: String, default: '' },
        fileUrl: { type: String, default: '' },
        fileSize: { type: String, default: '' },
        status: {
          type: String,
          enum: ['PENDING', 'VERIFIED', 'REJECTED'],
          default: 'VERIFIED',
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        notes: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound unique index ensuring employee code uniqueness per organization
EmployeeSchema.index({ organizationId: 1, employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ organizationId: 1, workEmail: 1 }, { unique: true });

// Virtual for full name
EmployeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export const Employee = mongoose.model('Employee', EmployeeSchema);
