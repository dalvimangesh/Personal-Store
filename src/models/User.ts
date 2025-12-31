import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple users to have no email (though we might want to enforce it for Google users)
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
    // Password is not strictly required at schema level to allow Google login.
    // Manual registration enforces this in the API route.
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Force delete the model in development to ensure schema changes are applied
if (process.env.NODE_ENV === 'development' && mongoose.models.User) {
  delete (mongoose as any).models.User;
}

export default mongoose.models.User || mongoose.model('User', UserSchema);

