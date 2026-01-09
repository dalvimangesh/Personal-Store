import mongoose, { Schema, Document } from 'mongoose';

export interface ITerminalCategory extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  isPublic: boolean;
  publicToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TerminalCategorySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    isPublic: { type: Boolean, default: false },
    publicToken: { type: String },
  },
  {
    timestamps: true,
  }
);

TerminalCategorySchema.index({ userId: 1, name: 1 }, { unique: true });
TerminalCategorySchema.index({ publicToken: 1 });

export default mongoose.models.TerminalCategory ||
  mongoose.model<ITerminalCategory>('TerminalCategory', TerminalCategorySchema);
