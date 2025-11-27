import mongoose, { Schema, Document } from 'mongoose';

export interface ISnippet extends Document {
  title: string;
  content: string;
  tags: string[];
  isHidden: boolean;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SnippetSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    tags: { type: [String], default: [] },
    isHidden: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Snippet ||
  mongoose.model<ISnippet>('Snippet', SnippetSchema);
