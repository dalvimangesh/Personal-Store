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

export default mongoose.models.TrackerCard || mongoose.model('TrackerCard', TrackerCardSchema);

