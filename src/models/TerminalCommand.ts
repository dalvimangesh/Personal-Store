import mongoose, { Schema, Document } from 'mongoose';

export interface ITerminalCommand extends Document {
  title: string;
  description: string;
  category: string;
  os: 'linux' | 'mac' | 'windows' | 'all';
  tags: string[];
  // Legacy single command support (optional now)
  command?: string; 
  // New Step-based support
  steps: {
    order: number;
    instruction: string; // "Step 1: Open terminal"
    command?: string;    // "git rebase -i HEAD~3" (optional, might be just info)
    warning?: string;    // "Be careful not to drop wrong commit"
  }[];
  variables: {
    name: string;
    description: string;
    defaultValue: string;
  }[];
  userId: mongoose.Types.ObjectId;
  sharedWith: mongoose.Types.ObjectId[];
  isPublic: boolean;
  publicToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TerminalCommandSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    // command field is now optional, for backward compatibility or simple one-liners
    command: { type: String, default: '' }, 
    description: { type: String, default: '' },
    category: { type: String, default: 'General' },
    os: { 
      type: String, 
      enum: ['linux', 'mac', 'windows', 'all'], 
      default: 'all' 
    },
    tags: { type: [String], default: [] },
    steps: [{
      order: { type: Number, required: true },
      instruction: { type: String, required: true },
      command: { type: String, default: '' },
      warning: { type: String, default: '' }
    }],
    variables: [{
      name: { type: String, required: true },
      description: { type: String, default: '' },
      defaultValue: { type: String, default: '' }
    }],
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isPublic: { type: Boolean, default: false },
    publicToken: { type: String },
  },
  {
    timestamps: true,
  }
);

TerminalCommandSchema.index({ userId: 1 });
TerminalCommandSchema.index({ sharedWith: 1 });
TerminalCommandSchema.index({ publicToken: 1 });
TerminalCommandSchema.index({ userId: 1, category: 1 });

// Handling Hot Reload in Next.js:
// If the model exists but doesn't have the 'sharedWith' path (old version), delete it so it gets recompiled.
if (mongoose.models.TerminalCommand) {
    const schema = mongoose.models.TerminalCommand.schema;
    if (!schema.paths['sharedWith'] || !schema.paths['steps']) {
        delete mongoose.models.TerminalCommand;
    }
}

export default mongoose.models.TerminalCommand ||
  mongoose.model<ITerminalCommand>('TerminalCommand', TerminalCommandSchema);
