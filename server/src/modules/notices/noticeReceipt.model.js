import mongoose from 'mongoose';

/**
 * Notice Receipt Schema
 * Tracks read status and employee acknowledgement per Section 4.15
 */
const NoticeReceiptSchema = new mongoose.Schema(
  {
    noticeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notice',
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    firstReadAt: {
      type: Date,
      default: Date.now,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One receipt record per employee per notice
NoticeReceiptSchema.index({ noticeId: 1, employeeId: 1 }, { unique: true });

export const NoticeReceipt = mongoose.model('NoticeReceipt', NoticeReceiptSchema);
