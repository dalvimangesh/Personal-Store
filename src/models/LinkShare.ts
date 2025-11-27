import mongoose, { Schema, Document } from 'mongoose';

export interface ILinkShare extends Document {
  userId: mongoose.Types.ObjectId;
  items: {
    label: string;
    value: string;
  }[];
  updatedAt: Date;
}

const LinkShareSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [{
      label: { type: String, default: "" },
      value: { type: String, default: "" }
    }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.LinkShare ||
  mongoose.model<ILinkShare>('LinkShare', LinkShareSchema);

