import mongoose, { Schema, Document } from 'mongoose';

export interface ISecret extends Document {
  content: string;
  createdAt: Date;
  expiresAt?: Date;
  viewCount: number;
  maxViews: number;
}

const SecretSchema: Schema = new Schema(
  {
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    viewCount: { type: Number, default: 0 },
    maxViews: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  }
);

// Add TTL index for auto-deletion if expiresAt is set
SecretSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Secret || mongoose.model<ISecret>('Secret', SecretSchema);

