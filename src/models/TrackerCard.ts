import mongoose from 'mongoose';

const TrackerCardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  columnId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrackerColumn',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  link: {
    type: String,
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

// Index for fetching cards by user, sorted by order
TrackerCardSchema.index({ user: 1, order: 1 });
// Index for operations filtering by columnId (e.g. fetching cards for a board view via column IDs, cascading deletes)
TrackerCardSchema.index({ columnId: 1 });

export default mongoose.models.TrackerCard || mongoose.model('TrackerCard', TrackerCardSchema);
