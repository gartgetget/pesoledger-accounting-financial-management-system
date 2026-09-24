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
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/chaching";
    cached.promise = mongoose.connect(uri).then((m) => {
      cached.conn = m;
      return m;
    });
  }

  await cached.promise;
}

connectDB().catch(() => {});

export default connectDB;
export { cached };
