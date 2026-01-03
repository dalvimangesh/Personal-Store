import mongoose, { Schema, Document } from 'mongoose';

export interface ISnippet extends Document {
  title: string;
  content: string;
  tags: string[];
  isHidden: boolean;
  isHiding: boolean;
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
    isHiding: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

SnippetSchema.index({ userId: 1 });

// Handling Hot Reload in Next.js:
if (mongoose.models.Snippet) {
    const schema = mongoose.models.Snippet.schema;
    if (!schema.paths['isHiding']) {
        delete mongoose.models.Snippet;
    }
}

export default mongoose.models.Snippet ||
  mongoose.model<ISnippet>('Snippet', SnippetSchema);
