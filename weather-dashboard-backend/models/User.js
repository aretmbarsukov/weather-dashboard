import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  avatar: { type: String },
  favorites: [{ type: String }],
  theme: { type: String, default: 'light' },
});

export default mongoose.model('User', userSchema);
