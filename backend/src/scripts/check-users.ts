import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import User from "../models/User";

async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("Connected to DB");
  const users = await User.find({}, "name phone email role");
  console.log("Users in DB count:", users.length);
  for (const u of users) {
    console.log(`- Role: ${u.role}, Name: ${u.name}, Phone: ${u.phone}, Email: ${u.email}`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
