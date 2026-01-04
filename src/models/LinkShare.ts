import mongoose, { Schema, Document } from 'mongoose';

export interface ILinkItem {
  label: string;
  value: string;
}

export interface ILinkCategory {
  _id?: string;
  name: string;
  items: ILinkItem[];
  isHidden?: boolean;
  folderId?: string;
}

export interface ILinkFolder {
  _id?: string;
  name: string;
}

export interface ILinkShare extends Document {
  userId: mongoose.Types.ObjectId;
  items: ILinkItem[]; // Legacy
  categories: ILinkCategory[];
  folders: ILinkFolder[];
  updatedAt: Date;
}

const LinkItemSchema = new Schema({
  label: { type: String, default: "" },
  value: { type: String, default: "" }
});

const LinkCategorySchema = new Schema({
  name: { type: String, default: "Default" },
  items: [LinkItemSchema],
  sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isPublic: { type: Boolean, default: false },
  publicToken: { type: String },
  isHidden: { type: Boolean, default: false },
  folderId: { type: String }
});

const LinkFolderSchema = new Schema({
  name: { type: String, required: true }
});

const LinkShareSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [LinkItemSchema], // Keeping for legacy migration
    categories: {
      type: [LinkCategorySchema],
      default: []
    },
    folders: {
      type: [LinkFolderSchema],
      default: []
    }
  },
  {
    timestamps: true,
  }
);

// Optimize queries for shared links and public access
LinkShareSchema.index({ "categories.sharedWith": 1 });
LinkShareSchema.index({ "categories.publicToken": 1 });

// Handling Hot Reload in Next.js:
// If the model exists but the schema is old (missing categories or sharedWith), delete it so it recompiles.
if (mongoose.models.LinkShare) {
  const schema = mongoose.models.LinkShare.schema;
  if (!schema.paths['categories']) {
    delete mongoose.models.LinkShare;
  } else {
    // Check for sharedWith in subschema
    const categoriesPath = schema.paths['categories'] as mongoose.Schema.Types.DocumentArray;
    if (categoriesPath.schema && (!categoriesPath.schema.paths['sharedWith'] || !categoriesPath.schema.paths['publicToken'])) {
         delete mongoose.models.LinkShare;
    }
  }
}

export default mongoose.models.LinkShare ||
  mongoose.model<ILinkShare>('LinkShare', LinkShareSchema);
