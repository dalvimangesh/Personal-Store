import mongoose, { Schema, Document } from 'mongoose';

export interface ISharedSnippet extends Document {
  title: string;
  content: string;
  tags: string[];
  userId: mongoose.Types.ObjectId;
  allowedUsers: string[]; // Array of usernames
  createdAt: Date;
  updatedAt: Date;
}

const SharedSnippetSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    tags: { type: [String], default: [] },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    allowedUsers: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

SharedSnippetSchema.index({ userId: 1 });
SharedSnippetSchema.index({ allowedUsers: 1 });

export default mongoose.models.SharedSnippet ||
  mongoose.model<ISharedSnippet>('SharedSnippet', SharedSnippetSchema);

