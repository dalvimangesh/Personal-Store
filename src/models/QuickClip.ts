import mongoose, { Schema, Document } from 'mongoose';

export interface IQuickClip extends Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  updatedAt: Date;
}

const QuickClipSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    content: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.QuickClip ||
  mongoose.model<IQuickClip>('QuickClip', QuickClipSchema);

