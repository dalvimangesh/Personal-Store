import mongoose from 'mongoose';

const TrackerBoardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    default: 'Main Board'
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for fetching boards by user, sorted by creation time
TrackerBoardSchema.index({ user: 1, createdAt: 1 });

export default mongoose.models.TrackerBoard || mongoose.model('TrackerBoard', TrackerBoardSchema);
