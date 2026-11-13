import mongoose from 'mongoose';

/**
 * Designation Schema
 * Represents job titles, hierarchy levels, and positions
 */
const DesignationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Designation title is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Designation code is required'],
      uppercase: true,
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    level: {
      type: String,
      default: 'L1',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

DesignationSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const Designation = mongoose.model('Designation', DesignationSchema);
