import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { randomUUID } from "crypto";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- MongoDB connection (safe)
const mongoUrl = process.env.MONGO_URL || "";

let FavoriteModel = null;
let usingMongo = false;

if (mongoUrl) {
  mongoose
    .connect(mongoUrl)
    .then(() => {
      console.log("Mongo connected");
      usingMongo = true;

      // Define schema and model after successful connection
      const favoriteSchema = new mongoose.Schema({
        name: String,
        lat: Number,
        lon: Number,
        createdAt: { type: Date, default: Date.now },
      });

      FavoriteModel = mongoose.models.Favorite || mongoose.model("Favorite", favoriteSchema);
    })
    .catch((err) => {
      console.error("Mongo error", err);
      console.warn("Continuing without MongoDB; using in-memory store");
      usingMongo = false;
    });
} else {
  console.warn("MONGO_URL not set — running without MongoDB; using in-memory store");
}

// --- In-memory fallback store
const memoryStore = {
  favorites: [],
};

// Helper to normalize favorite objects
function normalizeFavorite(obj) {
  return {
    id: obj._id || obj.id || obj._id?.toString?.() || randomUUID(),
    name: obj.name || "",
    lat: typeof obj.lat === "number" ? obj.lat : null,
    lon: typeof obj.lon === "number" ? obj.lon : null,
    createdAt: obj.createdAt || new Date(),
  };
}

// --- Routes

// Health
app.get("/health", (req, res) => {
  res.json({ status: "ok", mongo: usingMongo });
});

// Demo auth: creates a demo user object (no real auth)
app.post("/auth/demo", (req, res) => {
  const demoUser = {
    id: `demo-${randomUUID()}`,
    name: "Demo User",
    createdAt: new Date(),
  };
  res.json({ user: demoUser });
});

// Get favorites
app.get("/favorites", async (req, res) => {
  try {
    if (usingMongo && FavoriteModel) {
      const docs = await FavoriteModel.find().sort({ createdAt: -1 }).lean();
      return res.json(docs.map((d) => ({ id: d._id, name: d.name, lat: d.lat, lon: d.lon, createdAt: d.createdAt })));
    } else {
      return res.json(memoryStore.favorites.map(normalizeFavorite));
    }
  } catch (err) {
    console.error("GET /favorites error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Add favorite
app.post("/favorites", async (req, res) => {
  try {
    const { name, lat, lon } = req.body || {};
    if (!name) return res.status(400).json({ error: "Missing name" });

    if (usingMongo && FavoriteModel) {
      const doc = await FavoriteModel.create({ name, lat, lon });
      return res.status(201).json({ id: doc._id, name: doc.name, lat: doc.lat, lon: doc.lon, createdAt: doc.createdAt });
    } else {
      const item = { id: randomUUID(), name, lat: typeof lat === "number" ? lat : null, lon: typeof lon === "number" ? lon : null, createdAt: new Date() };
      memoryStore.favorites.unshift(item);
      return res.status(201).json(item);
    }
  } catch (err) {
    console.error("POST /favorites error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Remove favorite
app.delete("/favorites/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "Missing id" });

    if (usingMongo && FavoriteModel) {
      const result = await FavoriteModel.findByIdAndDelete(id);
      if (!result) return res.status(404).json({ error: "Not found" });
      return res.json({ success: true });
    } else {
      const before = memoryStore.favorites.length;
      memoryStore.favorites = memoryStore.favorites.filter((f) => (f.id || f._id) !== id && String(f._id || f.id) !== String(id));
      if (memoryStore.favorites.length === before) return res.status(404).json({ error: "Not found" });
      return res.json({ success: true });
    }
  } catch (err) {
    console.error("DELETE /favorites/:id error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Start server
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
