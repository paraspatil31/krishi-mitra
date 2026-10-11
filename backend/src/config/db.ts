import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not set. Check your .env file.");
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("MongoDB connection failed:", message);
    // Fail loudly on startup rather than limping along without a DB.
    process.exit(1);
  }
}
