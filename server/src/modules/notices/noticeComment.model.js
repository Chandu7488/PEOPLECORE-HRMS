import mongoose from 'mongoose';

/**
 * Notice Comment Schema
 * Supports employee interaction and discussions on notices when enabled
 */
const NoticeCommentSchema = new mongoose.Schema(
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
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['VISIBLE', 'HIDDEN', 'DELETED'],
      default: 'VISIBLE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

NoticeCommentSchema.index({ noticeId: 1, createdAt: 1 });

export const NoticeComment = mongoose.model('NoticeComment', NoticeCommentSchema);
