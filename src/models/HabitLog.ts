import mongoose, { Schema, Document } from 'mongoose';

export interface IHabitLog extends Document {
  habitId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  value?: number;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HabitLogSchema: Schema = new Schema(
  {
    habitId: { type: Schema.Types.ObjectId, ref: 'Habit', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    value: { type: Number },
    completed: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only have one log per habit per date
HabitLogSchema.index({ habitId: 1, date: 1 }, { unique: true });
HabitLogSchema.index({ userId: 1, date: 1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.HabitLog) {
  delete mongoose.models.HabitLog;
}

export default mongoose.models.HabitLog ||
  mongoose.model<IHabitLog>('HabitLog', HabitLogSchema);

