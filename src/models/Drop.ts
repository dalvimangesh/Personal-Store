import mongoose, { Schema, Document } from 'mongoose';

export interface IDrop extends Document {
  content: string;
  userId: mongoose.Types.ObjectId; // Receiver
  senderId: mongoose.Types.ObjectId; // Sender
  createdAt: Date;
}

const DropSchema: Schema = new Schema(
  {
    content: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Drop || mongoose.model<IDrop>('Drop', DropSchema);
