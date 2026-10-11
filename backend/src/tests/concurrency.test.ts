import assert from "node:assert/strict";
import Listing from "../models/Listing";
import Order from "../models/Order";
import User from "../models/User";
import { create as createOrder } from "../controllers/order.controller";
import { invokeController } from "./test-utils";

export async function runConcurrencyTests() {
  console.log("\n🧪 Running T7.1: Order Creation Transaction Concurrency Tests...");

  const timestamp = Date.now();
  const testPhoneBase = timestamp.toString().slice(-8);

  // 1. Setup mock farmer
  const farmer = await User.create({
    name: `Test Farmer ${timestamp}`,
    phone: `91${testPhoneBase}01`,
    passwordHash: "mock_hash_for_test",
    role: "farmer",
    district: "Nashik",
  });

  // 2. Setup mock buyers
  const buyer1 = await User.create({
    name: `Test Buyer 1 ${timestamp}`,
    phone: `91${testPhoneBase}02`,
    passwordHash: "mock_hash_for_test",
    role: "buyer",
    district: "Pune",
  });

  const buyer2 = await User.create({
    name: `Test Buyer 2 ${timestamp}`,
    phone: `91${testPhoneBase}03`,
    passwordHash: "mock_hash_for_test",
    role: "buyer",
    district: "Mumbai",
  });

  const validAddress = {
    fullName: "Ramesh Sharma",
    phone: "9876543210",
    street: "Plot 42, Green Valley",
    district: "Pune",
    state: "Maharashtra",
    pincode: "411001",
  };

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Two concurrent orders for the single last remaining stock unit
    // -------------------------------------------------------------------------
    console.log("  ↳ Subtest 1: Two concurrent orders competing for 1 unit of stock...");

    const singleUnitListing = await Listing.create({
      name: `Premium Alphonso Mango ${timestamp}`,
      category: "fruits",
      description: "Organic hand-picked mangoes",
      price: 500,
      unit: "kg",
      quantity: 1, // Exactly 1 unit available
      location: "Ratnagiri",
      images: ["https://example.com/mango.jpg"],
      farmerId: farmer._id.toString(),
      farmerName: farmer.name,
      harvestDate: "2026-09-01",
      status: "active",
      isActive: true,
    });

    const reqBuyer1: any = {
      user: { id: buyer1._id.toString(), role: "buyer" },
      body: {
        items: [{ productId: singleUnitListing._id.toString(), quantity: 1 }],
        deliveryAddress: validAddress,
      },
    };

    const reqBuyer2: any = {
      user: { id: buyer2._id.toString(), role: "buyer" },
      body: {
        items: [{ productId: singleUnitListing._id.toString(), quantity: 1 }],
        deliveryAddress: validAddress,
      },
    };

    // Fire both order creations in parallel
    const results = await Promise.allSettled([
      invokeController(createOrder, reqBuyer1),
      invokeController(createOrder, reqBuyer2),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<any>[];
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

    assert.equal(
      fulfilled.length,
      1,
      `Expected exactly 1 order to succeed under race condition, but got ${fulfilled.length}`
    );
    assert.equal(
      rejected.length,
      1,
      `Expected exactly 1 order to be rejected under race condition, but got ${rejected.length}`
    );

    // Verify the winning response
    assert.equal(fulfilled[0].value.status, 201, "Winning order should return HTTP 201");
    assert.ok(fulfilled[0].value.data.data._id, "Winning order should contain a valid order ID");

    // Verify the losing response status code / error
    const losingError = rejected[0].reason;
    assert.equal(
      losingError.statusCode,
      409,
      `Losing order should receive 409 conflict, got ${losingError.statusCode}`
    );
    assert.match(
      losingError.message,
      /enough stock|unavailable|no longer/i,
      "Losing order error message should clearly mention stock exhaustion"
    );

    // Verify database state: Stock must be exactly 0, status must be sold_out, isActive must be false
    const finalListing1 = await Listing.findById(singleUnitListing._id);
    assert.ok(finalListing1, "Listing must exist");
    assert.equal(finalListing1.quantity, 0, "Listing stock must be decremented to exactly 0");
    assert.equal(finalListing1.status, "sold_out", "Listing status must be 'sold_out'");
    assert.equal(finalListing1.isActive, false, "Listing isActive must be false");

    // Verify only one order was written to database
    const ordersInDb1 = await Order.find({ "items.productId": singleUnitListing._id.toString() });
    assert.equal(ordersInDb1.length, 1, "Exactly one Order document should be saved in DB");

    console.log("  ✅ Subtest 1 PASSED: Exactly 1 order succeeded, stock decremented to 0 with zero overselling.");

    // -------------------------------------------------------------------------
    // TEST 2: High concurrency - 5 buyers competing simultaneously for 3 units
    // -------------------------------------------------------------------------
    console.log("  ↳ Subtest 2: 5 concurrent buyers competing for 3 units of stock...");

    const multiUnitListing = await Listing.create({
      name: `Organic Wheat Grain ${timestamp}`,
      category: "grains",
      description: "Sharbati wheat",
      price: 45,
      unit: "kg",
      quantity: 3, // Exactly 3 units available
      location: "Sehore",
      images: ["https://example.com/wheat.jpg"],
      farmerId: farmer._id.toString(),
      farmerName: farmer.name,
      harvestDate: "2026-09-02",
      status: "active",
      isActive: true,
    });

    // Create 3 additional buyers for 5 total
    const additionalBuyers = await Promise.all([
      User.create({
        name: `Test Buyer 3 ${timestamp}`,
        phone: `91${testPhoneBase}04`,
        passwordHash: "mock_hash_for_test",
        role: "buyer",
      }),
      User.create({
        name: `Test Buyer 4 ${timestamp}`,
        phone: `91${testPhoneBase}05`,
        passwordHash: "mock_hash_for_test",
        role: "buyer",
      }),
      User.create({
        name: `Test Buyer 5 ${timestamp}`,
        phone: `91${testPhoneBase}06`,
        passwordHash: "mock_hash_for_test",
        role: "buyer",
      }),
    ]);

    const allBuyers = [buyer1, buyer2, ...additionalBuyers];

    const concurrentRequests = allBuyers.map((b) => {
      const req: any = {
        user: { id: b._id.toString(), role: "buyer" },
        body: {
          items: [{ productId: multiUnitListing._id.toString(), quantity: 1 }],
          deliveryAddress: validAddress,
        },
      };
      return invokeController(createOrder, req);
    });

    const multiResults = await Promise.allSettled(concurrentRequests);

    const multiFulfilled = multiResults.filter((r) => r.status === "fulfilled");
    const multiRejected = multiResults.filter((r) => r.status === "rejected");

    assert.equal(
      multiFulfilled.length,
      3,
      `Expected exactly 3 orders to succeed for 3 available units, got ${multiFulfilled.length}`
    );
    assert.equal(
      multiRejected.length,
      2,
      `Expected exactly 2 orders to be rejected, got ${multiRejected.length}`
    );

    const finalListing2 = await Listing.findById(multiUnitListing._id);
    assert.equal(finalListing2?.quantity, 0, "Final stock must be exactly 0");
    assert.equal(finalListing2?.status, "sold_out", "Final status must be 'sold_out'");
    assert.equal(finalListing2?.isActive, false, "Final isActive must be false");

    const ordersInDb2 = await Order.find({ "items.productId": multiUnitListing._id.toString() });
    assert.equal(ordersInDb2.length, 3, "Database must contain exactly 3 confirmed orders");

    console.log("  ✅ Subtest 2 PASSED: 3 succeeded, 2 rejected cleanly with zero inventory leakage.");

  } finally {
    // Cleanup fixtures created in this run
    await User.deleteMany({ phone: new RegExp(`^91${testPhoneBase}`) });
    await Listing.deleteMany({ name: new RegExp(`${timestamp}`) });
    await Order.deleteMany({ farmerId: farmer._id.toString() });
  }
}
