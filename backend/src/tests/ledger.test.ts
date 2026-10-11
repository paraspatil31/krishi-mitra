import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../models/User";
import Listing from "../models/Listing";
import LedgerEntry from "../models/LedgerEntry";
import { LedgerService } from "../services/ledger.service";
import { getProvenance } from "../controllers/ledger.controller";
import { invokeController } from "./test-utils";

export async function runLedgerTests() {
  console.log("\n🧪 Running Phase 6: Blockchain Provenance Ledger Test Suite (T6.1 – T6.6)...");

  const timestamp = Date.now();
  const phone = `955${timestamp.toString().slice(-7)}`;

  // 1. Create a certified test farmer
  const farmer = await User.create({
    name: `Organic Kisan ${timestamp}`,
    phone,
    passwordHash: "mock_hash_farmer",
    role: "farmer",
    district: "Nashik",
  });

  // 2. Unit Test: Deterministic cryptographic hash generation
  console.log("  • Subtest 1: Deterministic SHA-256 Payload Hashing...");
  const mockListingId = new mongoose.Types.ObjectId().toString();
  const mockHarvestDate = "2026-09-11";
  const hash1 = LedgerService.generatePayloadHash(mockListingId, farmer.id, "Tomato", mockHarvestDate, "A");
  const hash2 = LedgerService.generatePayloadHash(mockListingId, farmer.id, "Tomato", mockHarvestDate, "A");
  const hashDiff = LedgerService.generatePayloadHash(mockListingId, farmer.id, "Tomato", mockHarvestDate, "B");

  assert.strictEqual(hash1.length, 66, "Hash should be 66 characters (0x + 64 hex chars)");
  assert.ok(hash1.startsWith("0x"), "Hash starts with 0x EVM prefix");
  assert.strictEqual(hash1, hash2, "Identical parameters must generate deterministic hash");
  assert.notStrictEqual(hash1, hashDiff, "Different quality grades must produce distinct hashes");
  console.log("    ✓ Deterministic cryptographic payload hash verified");

  // 3. Test: Direct & Asynchronous ledger recording linked to Listing
  console.log("  • Subtest 2: Produce Listing creation and ledger entry attachment...");
  const listing = await Listing.create({
    name: "Nashik Farm Gate Grapes",
    category: "Fruits",
    description: "Export quality table grapes verified at farm gate.",
    price: 80,
    unit: "kg",
    quantity: 500,
    location: "Dindori, Nashik",
    harvestDate: "2026-09-10",
    qualityGrade: "A",
    farmerId: farmer.id,
    farmerName: farmer.name,
    status: "active",
    isActive: true,
  });

  // Trigger provenance recording
  const entry = await LedgerService.recordProvenanceDirect(listing, farmer);

  assert.ok(entry, "LedgerEntry must be generated");
  assert.strictEqual(entry.listingId.toString(), listing.id);
  assert.strictEqual(entry.farmerId.toString(), farmer.id);
  assert.strictEqual(entry.cropName, "Nashik Farm Gate Grapes");
  assert.ok(entry.txHash.startsWith("0x"));
  assert.ok(entry.blockNumber >= 18000000, "Block number should match Polygon Amoy range");
  assert.strictEqual(entry.network, "Polygon-Amoy-AgriLedger");
  assert.strictEqual(entry.qualityTag, "A-Grade Farm Gate Certified");

  // Verify listing record was updated with transaction metadata
  const updatedListing = await Listing.findById(listing._id);
  assert.strictEqual(updatedListing?.txHash, entry.txHash);
  assert.strictEqual(updatedListing?.blockchainBlockNumber, entry.blockNumber);
  console.log(`    ✓ Provenance ledger entry created: Block #${entry.blockNumber}, Tx: ${entry.txHash.slice(0, 18)}...`);

  // 4. Test: Public Provenance Retrieval via Service & Controller
  console.log("  • Subtest 3: Public Provenance lookup endpoint (/api/ledger/:listingId)...");
  const certDetails = await LedgerService.getProvenanceByListing(listing.id, "https://krishibazaar.in");
  assert.strictEqual(certDetails.listingId, listing.id);
  assert.strictEqual(certDetails.cropName, "Nashik Farm Gate Grapes");
  assert.strictEqual(certDetails.isAuthentic, true);
  assert.ok(certDetails.verificationUrl.includes(`/verify/${listing.id}`));
  assert.ok(certDetails.explorerUrl.includes("polygonscan.com/tx/0x"));

  // Invoke Controller via test harness
  const ctrlRes = await invokeController(getProvenance, {
    params: { listingId: listing.id },
    get: (header: string) => (header === "origin" ? "https://krishibazaar.in" : undefined),
    protocol: "https",
  } as any);

  assert.strictEqual(ctrlRes.status, 200);
  assert.strictEqual(ctrlRes.data.data.cropName, "Nashik Farm Gate Grapes");
  assert.strictEqual(ctrlRes.data.data.txHash, entry.txHash);
  console.log("    ✓ Controller returned 200 with full provenance certificate");

  // 5. Test: Validation & Error Handling
  console.log("  • Subtest 4: Invalid listing ID handling...");
  try {
    await invokeController(getProvenance, { params: { listingId: "invalid_id" } } as any);
    assert.fail("Should have rejected invalid listing ID");
  } catch (err: any) {
    assert.strictEqual(err.statusCode, 400);
    console.log("    ✓ Rejected malformed listing ID with 400");
  }

  // 6. Test: Hard Rule 7 Non-Blocking Isolation
  console.log("  • Subtest 5: Hard Rule 7 non-blocking async execution guarantee...");
  // triggerAsyncLedgerWrite runs on setImmediate; verify calling it does not block or throw
  assert.doesNotThrow(() => {
    LedgerService.triggerAsyncLedgerWrite(listing, farmer);
  });
  console.log("    ✓ Asynchronous detached dispatch executed without blocking or throwing");

  // 7. Cleanup
  await LedgerEntry.deleteMany({ listingId: listing._id });
  await Listing.findByIdAndDelete(listing._id);
  await User.findByIdAndDelete(farmer._id);
  console.log("    ✓ Cleaned up test records");

  console.log("✅ Phase 6 Blockchain Provenance Ledger Test Suite passed successfully!\n");
}
