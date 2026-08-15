import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/', auth, async (req, res) => {
  const { city } = req.body;
  const user = await User.findById(req.userId);
  if (!user.favorites.includes(city)) {
    user.favorites.push(city);
    await user.save();
  }
  res.json(user.favorites);
});

router.delete('/', auth, async (req, res) => {
  const { city } = req.body;
  const user = await User.findById(req.userId);
  user.favorites = user.favorites.filter(c => c !== city);
  await user.save();
  res.json(user.favorites);
});

export default router;