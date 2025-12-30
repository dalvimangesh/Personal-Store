import mongoose, { Schema, Document } from 'mongoose';

export interface ITodoItem {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  priority: number;
  startDate?: Date;
  deadline?: Date;
  isCompleted: boolean;
  status: 'todo' | 'in_progress' | 'completed';
  createdAt?: Date;
}

export interface ITodoCategory {
  _id?: mongoose.Types.ObjectId;
  name: string;
  items: ITodoItem[];
  sharedWith?: mongoose.Types.ObjectId[];
  isPublic?: boolean;
  publicToken?: string;
}

export interface ITodoStore extends Document {
  userId: mongoose.Types.ObjectId;
  categories: ITodoCategory[];
  createdAt: Date;
  updatedAt: Date;
}

const TodoItemSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  priority: { type: Number, required: true, min: 0, max: 9, default: 0 },
  startDate: { type: Date },
  deadline: { type: Date },
  isCompleted: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['todo', 'in_progress', 'completed'], 
    default: 'todo' 
  },
  createdAt: { type: Date, default: Date.now }
});

const TodoCategorySchema = new Schema({
  name: { type: String, default: "Default" },
  items: [TodoItemSchema],
  sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isPublic: { type: Boolean, default: false },
  publicToken: { type: String }
});

const TodoStoreSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    categories: {
      type: [TodoCategorySchema],
      default: []
    }
  },
  {
    timestamps: true,
  }
);

TodoStoreSchema.index({ userId: 1 });
TodoStoreSchema.index({ "categories.sharedWith": 1 });
TodoStoreSchema.index({ "categories.publicToken": 1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.TodoStore) {
  delete mongoose.models.TodoStore;
}

export default mongoose.models.TodoStore ||
  mongoose.model<ITodoStore>('TodoStore', TodoStoreSchema);

