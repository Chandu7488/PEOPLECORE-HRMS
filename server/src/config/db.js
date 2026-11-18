import mongoose from 'mongoose';
import { ENV } from './env.js';

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB using Mongoose with serverless singleton connection caching
 */
export const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 3500,
      autoIndex: false,
    };

    cached.promise = mongoose.connect(ENV.MONGODB_URI, opts).then((m) => {
      console.log('✅ MongoDB connected successfully');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ Failed to connect to MongoDB:', e.message);
    throw e;
  }

  return cached.conn;
};

/**
 * Disconnect from MongoDB gracefully
 */
export const disconnectDB = async () => {
  try {
    if (cached.conn) {
      await mongoose.disconnect();
      cached.conn = null;
      cached.promise = null;
      console.log('MongoDB disconnected through app termination');
    }
  } catch (err) {
    console.error('Error during MongoDB disconnection:', err);
  }
};
