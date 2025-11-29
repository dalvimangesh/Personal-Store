import mongoose, { Schema, Document } from 'mongoose';

export interface IDeletedItem extends Document {
  userId: mongoose.Types.ObjectId;
  originalId: string; // Can be ObjectId or string ID from subdocument
  type: 'drop' | 'snippet' | 'link';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any; // Store the original data as JSON
  createdAt: Date;
}

const DeletedItemSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    originalId: { type: String, required: true },
    type: { type: String, required: true, enum: ['drop', 'snippet', 'link'] },
    content: { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // We only care when it was deleted
  }
);

export default mongoose.models.DeletedItem ||
  mongoose.model<IDeletedItem>('DeletedItem', DeletedItemSchema);

