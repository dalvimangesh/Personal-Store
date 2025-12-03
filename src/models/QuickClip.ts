import mongoose, { Schema, Document } from 'mongoose';

export interface IClipboard {
  _id?: string;
  name: string;
  content: string;
}

export interface IQuickClip extends Document {
  userId: mongoose.Types.ObjectId;
  content: string; // Legacy
  clipboards: IClipboard[];
  updatedAt: Date;
}

const ClipboardSchema = new Schema({
  name: { type: String, default: "New Clipboard" },
  content: { type: String, default: "" },
  sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

const QuickClipSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    content: { type: String, default: "" }, // Legacy field
    clipboards: {
      type: [ClipboardSchema],
      default: []
    }
  },
  {
    timestamps: true,
  }
);

// Handling Hot Reload in Next.js:
if (mongoose.models.QuickClip) {
    const schema = mongoose.models.QuickClip.schema;
    if (!schema.paths['clipboards']) {
        delete mongoose.models.QuickClip;
    } else {
        // Check for sharedWith in subschema
        const clipboardsPath = schema.paths['clipboards'] as mongoose.Schema.Types.DocumentArray;
        if (clipboardsPath.schema && !clipboardsPath.schema.paths['sharedWith']) {
             delete mongoose.models.QuickClip;
        }
    }
}

export default mongoose.models.QuickClip ||
  mongoose.model<IQuickClip>('QuickClip', QuickClipSchema);
