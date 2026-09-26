import mongoose from "mongoose";
import dotenv from "dotenv";
import { runLedgerBackfill } from "./ledgerBackfill.js";

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
      const err: any = new Error("MONGO_URI is not configured");
      err.status = 500;
      throw err;
    }
    if (!/^(mongodb\+srv|mongodb):\/\//i.test(uri)) {
      const preview = JSON.stringify(uri.slice(0, 40));
      const err: any = new Error(
        `MONGO_URI must start with mongodb:// or mongodb+srv:// (got ${preview})`,
      );
      err.status = 500;
      throw err;
    }
    cached.promise = mongoose.connect(uri).then((m) => {
      cached.conn = m;
      void runLedgerBackfill().catch((e: any) => {
        console.error("Ledger backfill failed:", e?.message || e);
      });
      return m;
    });
    void cached.promise.catch((e: any) => {
      cached.promise = null;
      if (e && !e.mongoUriPreview) {
        e.mongoUriPreview = uri.slice(0, 40);
      }
    });
  }

  await cached.promise;
}

connectDB().catch((err) => {
  console.error("MongoDB initial connect failed:", err?.message || err);
});

export default connectDB;
export { cached };
