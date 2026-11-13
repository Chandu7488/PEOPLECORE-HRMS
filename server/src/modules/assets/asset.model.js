import mongoose from 'mongoose';

/**
 * Company Asset Schema
 * Tracks IT hardware, office assets, and employee custody allocations
 */
const AssetSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    assetTag: {
      type: String,
      required: [true, 'Asset tag is required'],
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['LAPTOP', 'MONITOR', 'PHONE', 'FURNITURE', 'PERIPHERAL', 'VEHICLE', 'OTHER'],
      default: 'LAPTOP',
      index: true,
    },
    serialNumber: {
      type: String,
      trim: true,
      default: '',
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ALLOCATED', 'MAINTENANCE', 'RETIRED'],
      default: 'AVAILABLE',
      index: true,
    },
    allocatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    allocatedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AssetSchema.index({ organizationId: 1, assetTag: 1 }, { unique: true });

export const Asset = mongoose.model('Asset', AssetSchema);
