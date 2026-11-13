import mongoose from 'mongoose';

/**
 * Notice Schema
 * Represents company announcements and targeted notices per Section 4.15
 */
const NoticeSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notice title is required'],
      trim: true,
    },
    bodyHtml: {
      type: String,
      required: [true, 'Notice content is required'],
    },
    category: {
      type: String,
      enum: [
        'GENERAL',
        'POLICY',
        'HOLIDAY_CALENDAR',
        'EVENT',
        'URGENT',
        'LEADERSHIP',
        'COMPLIANCE',
        'IT_MAINTENANCE',
      ],
      default: 'GENERAL',
      index: true,
    },
    priority: {
      type: String,
      enum: ['NORMAL', 'IMPORTANT', 'URGENT'],
      default: 'NORMAL',
      index: true,
    },
    audience: {
      type: {
        type: String,
        enum: ['ALL', 'LOCATIONS', 'DEPARTMENTS', 'ROLES'],
        default: 'ALL',
      },
      targetIds: [{ type: mongoose.Schema.Types.ObjectId }],
    },
    publishAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expireAt: {
      type: Date,
      default: null,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    requiresAck: {
      type: Boolean,
      default: false,
    },
    ackDueAt: {
      type: Date,
      default: null,
    },
    commentsEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'EXPIRED', 'WITHDRAWN'],
      default: 'PUBLISHED',
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
    revisions: [
      {
        version: { type: Number },
        editedAt: { type: Date, default: Date.now },
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        snapshotTitle: { type: String },
        snapshotBody: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for rapid audience and priority queries
NoticeSchema.index({ organizationId: 1, status: 1, isPinned: -1, publishAt: -1 });

export const Notice = mongoose.model('Notice', NoticeSchema);
