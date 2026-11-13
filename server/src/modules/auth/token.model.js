import mongoose from 'mongoose';

const PasswordResetTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ['RESET', 'INVITE'],
      default: 'RESET',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index: automatically deletes expired token documents
    },
    usedAt: {
      type: Date,
      default: null,
    },
    requestedIp: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PasswordResetToken = mongoose.model('PasswordResetToken', PasswordResetTokenSchema);
