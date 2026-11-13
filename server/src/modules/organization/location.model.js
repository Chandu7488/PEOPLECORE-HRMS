import mongoose from 'mongoose';

/**
 * Location Schema
 * Represents company branch offices, headquarters, and work locations
 */
const LocationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Location code is required'],
      uppercase: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      default: 'India',
      trim: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    isHeadquarters: {
      type: Boolean,
      default: false,
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

LocationSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const Location = mongoose.model('Location', LocationSchema);
