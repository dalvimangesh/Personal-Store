import mongoose, { Schema, Document } from 'mongoose';

export interface IDropToken extends Document {
  token: string;
  userId: mongoose.Types.ObjectId;
  isUsed: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

const DropTokenSchema: Schema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isUsed: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups and auto-deletion if we want TTL
DropTokenSchema.index({ token: 1 });
DropTokenSchema.index({ userId: 1 });

export default mongoose.models.DropToken || mongoose.model<IDropToken>('DropToken', DropTokenSchema);

