import mongoose from 'mongoose';

/**
 * Organization Schema
 * Represents the top-level company organization and global settings
 */
const OrganizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    legalName: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Organization code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    fiscalYearStart: {
      type: String,
      default: '04-01', // April 1st
    },
    fiscalYearEnd: {
      type: String,
      default: '03-31', // March 31st
    },
    workWeek: {
      type: [String],
      default: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, default: 'India', trim: true },
      pincode: { type: String, trim: true },
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Organization = mongoose.model('Organization', OrganizationSchema);
