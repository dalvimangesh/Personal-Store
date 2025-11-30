import mongoose, { Schema, Document } from 'mongoose';

export interface ITodo extends Document {
  title: string;
  description?: string;
  priority: number;
  deadline?: Date;
  isCompleted: boolean;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TodoSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    priority: { type: Number, required: true, min: 0, max: 9, default: 0 },
    deadline: { type: Date },
    isCompleted: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

// Prevent Mongoose OverwriteModelError in development by checking if model exists
// However, to ensure schema updates are applied in dev without restart, we can delete the model
if (process.env.NODE_ENV !== 'production' && mongoose.models.Todo) {
  delete mongoose.models.Todo;
}

export default mongoose.models.Todo ||
  mongoose.model<ITodo>('Todo', TodoSchema);
