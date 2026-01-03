import mongoose, { Schema, Document } from 'mongoose';

export interface IHabit extends Document {
  title: string;
  description?: string;
  goalValue?: number;
  goalUnit?: string;
  frequency: 'daily' | 'weekly';
  isHidden: boolean;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HabitSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    goalValue: { type: Number },
    goalUnit: { type: String },
    frequency: { 
      type: String, 
      enum: ['daily', 'weekly'], 
      default: 'daily' 
    },
    isHidden: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

HabitSchema.index({ userId: 1, createdAt: -1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.Habit) {
  delete mongoose.models.Habit;
}

export default mongoose.models.Habit ||
  mongoose.model<IHabit>('Habit', HabitSchema);

