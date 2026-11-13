import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorEmail: {
      type: String,
      default: null,
    },
    targetId: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false }, // Immutable append-only audit trail
  }
);

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

/**
 * Helper to record an immutable audit event
 * @param {object} params - Audit event parameters
 */
export const recordAuditLog = async ({
  action,
  actorId = null,
  actorEmail = null,
  targetId = null,
  ipAddress = null,
  userAgent = null,
  status = 'SUCCESS',
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      action,
      actorId,
      actorEmail,
      targetId,
      ipAddress,
      userAgent,
      status,
      metadata,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};
