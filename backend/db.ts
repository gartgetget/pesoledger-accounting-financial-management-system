import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const globalForMongoose = globalThis as unknown as {
  mongoose: { conn: any; promise: any } | null;
};

let cached = globalForMongoose.mongoose || { conn: null, promise: null };

if (!globalForMongoose.mongoose) {
  globalForMongoose.mongoose = cached;
}

async function connectDB(): Promise<void> {
  if (cached.conn) {
    return;
  }

  if (!cached.promise) {
    const raw = process.env.MONGO_URI;
    const uri = (raw || "")
      .trim()
      .replace(/^["']+|["']+$/g, "")
      .trim();
    if (!uri) {
      throw new Error("MONGO_URI is not configured");
    }
    if (!/^(mongodb\+srv|mongodb):\/\//i.test(uri)) {
      const preview = uri.slice(0, 24);
      throw new Error(
        `MONGO_URI must start with mongodb:// or mongodb+srv:// (got: "${preview}...")`,
      );
    }
    cached.promise = mongoose.connect(uri).then((m) => {
      cached.conn = m;
      return m;
    });
    cached.promise.catch(() => {
      cached.promise = null;
    });
  }

  await cached.promise;
}

connectDB().catch((err) => {
  console.error("MongoDB initial connect failed:", err?.message || err);
});

export default connectDB;
export { cached };
