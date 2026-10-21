import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import User from "../models/User";

async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("Connected to MongoDB");

  const phone = "7875296828";
  let buyer = await User.findOne({ phone });

  const passwordHash = await bcrypt.hash("12345678", 10);

  if (buyer) {
    console.log("Buyer already exists, updating credentials...");
    buyer.passwordHash = passwordHash;
    buyer.role = "buyer";
    buyer.buyerType = "household";
    buyer.isPhoneVerified = true;
    buyer.isVerifiedBuyer = true;
    await buyer.save();
    console.log("Buyer updated successfully.");
  } else {
    console.log("Creating buyer account for phone:", phone);
    buyer = await User.create({
      name: "Krishi Buyer",
      phone,
      passwordHash,
      role: "buyer",
      buyerType: "household",
      district: "Pune",
      isPhoneVerified: true,
      isVerifiedBuyer: true,
      preferredLanguage: "en",
      location: {
        type: "Point",
        coordinates: [73.8567, 18.5204], // Pune coordinates
      },
    });
    console.log("Buyer created successfully:", buyer.id);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Error creating buyer:", err);
  process.exit(1);
});
