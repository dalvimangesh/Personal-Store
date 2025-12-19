import mongoose from 'mongoose';

const TrackerColumnSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrackerBoard',
    required: false, // Optional for backward compatibility, but should be populated
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  order: {
    type: Number,
    required: true,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for fetching columns by user and board, sorted by order
TrackerColumnSchema.index({ user: 1, boardId: 1, order: 1 });
// Index for operations that might filter by boardId only (e.g. cascading deletes)
TrackerColumnSchema.index({ boardId: 1 });

export default mongoose.models.TrackerColumn || mongoose.model('TrackerColumn', TrackerColumnSchema);
