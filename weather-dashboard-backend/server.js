// server.js
import express from "express";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------- Config / Env ---------- */
const PORT = process.env.PORT || 10000;
const MONGO_URL = process.env.MONGO_URL || "";
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
const JWT_EXPIRES = "7d";

/* ---------- Mongo connection ---------- */
let usingMongo = false;
if (MONGO_URL) {
  mongoose
    .connect(MONGO_URL, { dbName: "weather-dashboard" })
    .then(() => {
      console.log("Mongo connected");
      usingMongo = true;
    })
    .catch((err) => {
      console.error("Mongo connection error:", err.message || err);
      usingMongo = false;
    });
}

/* ---------- User model (mongoose) ---------- */
let UserModel = null;
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: String,
  name: String,
  createdAt: { type: Date, default: Date.now },
});
try {
  UserModel = mongoose.models.User || mongoose.model("User", userSchema);
} catch (e) {
  UserModel = mongoose.model("User", userSchema);
}

/* ---------- In-memory fallback ---------- */
const memoryUsers = [];

/* ---------- Helpers ---------- */
function createToken(user) {
  return jwt.sign(
    { id: user._id?.toString?.() || user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/* ---------- Health endpoint ---------- */
app.get("/health", (req, res) => {
  res.json({ status: "ok", mongo: usingMongo });
});

/* ---------- Auth: register ---------- */
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Missing email or password" });

    const passwordHash = await bcrypt.hash(password, 10);

    if (usingMongo) {
      const existing = await UserModel.findOne({ email }).lean();
      if (existing) return res.status(409).json({ error: "User exists" });
      const user = await UserModel.create({ email, passwordHash, name });
      const token = createToken(user);
      return res.status(201).json({ user: { id: user._id, email: user.email, name: user.name }, token });
    } else {
      if (memoryUsers.find((u) => u.email === email)) return res.status(409).json({ error: "User exists" });
      const user = { id: randomUUID(), email, passwordHash, name, createdAt: new Date() };
      memoryUsers.push(user);
      const token = createToken(user);
      return res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, token });
    }
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

/* ---------- Auth: login ---------- */
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Missing email or password" });

    let user;
    if (usingMongo) {
      user = await UserModel.findOne({ email });
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });
      const token = createToken(user);
      return res.json({ user: { id: user._id, email: user.email, name: user.name }, token });
    } else {
      user = memoryUsers.find((u) => u.email === email);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });
      const token = createToken(user);
      return res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
    }
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

/* ---------- Auth middleware ---------- */
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* ---------- Example protected route ---------- */
app.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

/* ---------- Fallback 404 (last) ---------- */
app.use((req, res) => res.status(404).json({ error: "Not found" }));

/* ---------- Start server ---------- */
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
