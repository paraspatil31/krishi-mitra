import assert from "node:assert/strict";
import mongoose from "mongoose";
import User, { IUser } from "../models/User";
import Listing from "../models/Listing";
import Offer from "../models/Offer";
import Order from "../models/Order";
import {
  getFPOStats,
  getMembers,
  addMember,
  removeMember,
  getAggregatedLots,
  createMemberLot,
  getAggregatedOffers,
  getAggregatedOrders,
} from "../controllers/fpo.controller";
import { respondToOffer } from "../controllers/offer.controller";
import { updateStatus as updateOrderStatus } from "../controllers/order.controller";
import { invokeController } from "./test-utils";

export async function runFPOAggregationTests() {
  console.log("\n🧪 Running T11.6: FPO Multi-Farm Aggregation Hub Test Suite...");

  const timestamp = Date.now();
  const phoneSuffix = timestamp.toString().slice(-7);

  // 1. Create FPO 1 ("Sahyadri Farmers Co-op")
  const fpo1 = await User.create({
    name: `Sahyadri Farmers Producer Co ${timestamp}`,
    phone: `901${phoneSuffix}`,
    passwordHash: "mock_hash_fpo1",
    role: "fpo",
    district: "Nashik",
    fpoProfile: {
      orgName: `Sahyadri Farmers Producer Co ${timestamp}`,
      registrationNumber: `FPO-MH-NSK-${timestamp}`,
      totalMembersCount: 0,
      commoditiesHandled: ["Onions", "Grapes", "Tomatoes"],
    },
  });

  // 2. Create FPO 2 ("MahaAgro Producer Co") to verify multi-tenant isolation
  const fpo2 = await User.create({
    name: `MahaAgro Producer Co ${timestamp}`,
    phone: `902${phoneSuffix}`,
    passwordHash: "mock_hash_fpo2",
    role: "fpo",
    district: "Pune",
    fpoProfile: {
      orgName: `MahaAgro Producer Co ${timestamp}`,
      registrationNumber: `FPO-MH-PUN-${timestamp}`,
      totalMembersCount: 0,
      commoditiesHandled: ["Pomegranates", "Sugarcane"],
    },
  });

  // 3. Create independent farmers
  const farmer1 = await User.create({
    name: `Farmer Tukaram ${timestamp}`,
    phone: `903${phoneSuffix}`,
    passwordHash: "mock_hash_farmer1",
    role: "farmer",
    district: "Nashik",
    farmProfile: {
      farmAddress: "Village Dindori, Nashik",
      landSizeAcres: 12.5,
      primaryCrops: ["Onions", "Grapes"],
      organicCertified: true,
    },
  });

  const farmer2 = await User.create({
    name: `Farmer Ananda ${timestamp}`,
    phone: `904${phoneSuffix}`,
    passwordHash: "mock_hash_farmer2",
    role: "farmer",
    district: "Nashik",
    farmProfile: {
      farmAddress: "Village Niphad, Nashik",
      landSizeAcres: 8.0,
      primaryCrops: ["Tomatoes"],
      organicCertified: false,
    },
  });

  const farmer3 = await User.create({
    name: `Farmer Ramesh (Belongs to FPO2) ${timestamp}`,
    phone: `905${phoneSuffix}`,
    passwordHash: "mock_hash_farmer3",
    role: "farmer",
    district: "Pune",
    fpoId: fpo2._id.toString(),
    farmProfile: {
      farmAddress: "Village Baramati, Pune",
      landSizeAcres: 15.0,
      primaryCrops: ["Sugarcane"],
    },
  });

  // 4. Create Buyer
  const buyer = await User.create({
    name: `FreshMart Wholesale Buyer ${timestamp}`,
    phone: `906${phoneSuffix}`,
    passwordHash: "mock_hash_buyer",
    role: "buyer",
    buyerType: "business",
    district: "Mumbai",
  });

  try {
    // -------------------------------------------------------------------------
    // SUBTEST 1: FPO Member Onboarding & Profile Sync
    // -------------------------------------------------------------------------
    console.log("  ↳ Subtest 1: Onboard member farmers to FPO 1...");

    const addRes1 = await invokeController(addMember, {
      user: { id: fpo1._id.toString(), role: "fpo" },
      body: { phone: farmer1.phone },
    } as any);

    assert.equal(addRes1.status, 200, "Should successfully link existing Farmer 1");
    assert.equal(addRes1.data.data.name, farmer1.name);
    assert.equal(addRes1.data.data.fpoId, fpo1._id.toString());

    const addRes2 = await invokeController(addMember, {
      user: { id: fpo1._id.toString(), role: "fpo" },
      body: { phone: farmer2.phone },
    } as any);
    assert.equal(addRes2.status, 200, "Should successfully link existing Farmer 2");

    // Verify members list for FPO 1
    const membersRes1 = await invokeController(getMembers, {
      user: { id: fpo1._id.toString(), role: "fpo" },
      query: {},
    } as any);

    assert.equal(membersRes1.status, 200);
    assert.equal(membersRes1.data.data.length, 2, "FPO 1 must have exactly 2 members");
    const memberIds = membersRes1.data.data.map((m: any) => m.id);
    assert.ok(memberIds.includes(farmer1._id.toString()));
    assert.ok(memberIds.includes(farmer2._id.toString()));

    // -------------------------------------------------------------------------
    // SUBTEST 2: Strict Server-Side Isolation Between FPOs
    // -------------------------------------------------------------------------
    console.log("  ↳ Subtest 2: Strict server-side member isolation between FPO 1 and FPO 2...");

    // FPO 2 members list should only see Farmer 3
    const membersRes2 = await invokeController(getMembers, {
      user: { id: fpo2._id.toString(), role: "fpo" },
      query: {},
    } as any);
    assert.equal(membersRes2.status, 200);
    assert.equal(membersRes2.data.data.length, 1, "FPO 2 must only have Farmer 3");
    assert.equal(membersRes2.data.data[0].id, farmer3._id.toString());

    // FPO 1 attempts to remove Farmer 3 (who belongs to FPO 2) -> must fail
    try {
      await invokeController(removeMember, {
        user: { id: fpo1._id.toString(), role: "fpo" },
        params: { id: farmer3._id.toString() },
      } as any);
      assert.fail("FPO 1 should not be able to unlink another FPO's farmer");
    } catch (err: any) {
      assert.ok(err.statusCode === 404 || err.message.includes("not found"), "Should reject unlinking foreign farmer");
    }

    // -------------------------------------------------------------------------
    // SUBTEST 3: Aggregated Lot Creation & Scoped Retrieval
    // -------------------------------------------------------------------------
    console.log("  ↳ Subtest 3: Create aggregated lots with member farmer attribution...");

    // FPO 1 creates a lot attributed to Farmer 1
    const createLotRes1 = await invokeController(createMemberLot, {
      user: { id: fpo1._id.toString(), role: "fpo" },
      body: {
        name: "Nashik Red Onion Grade A",
        category: "vegetables",
        description: "Aggregated Nashik onions directly from Dindori cluster",
        price: 28,
        unit: "kg",
        quantity: 2500,
        minOrderQuantity: 100,
        memberFarmerId: farmer1._id.toString(),
        qualityGrade: "Grade A Export",
      },
    } as any);

    assert.equal(createLotRes1.status, 201, "Aggregated lot 1 creation succeeded");
    const lot1 = createLotRes1.data.data;
    assert.equal(lot1.fpoId, fpo1._id.toString());
    assert.equal(lot1.memberFarmerId, farmer1._id.toString());
    assert.equal(lot1.memberFarmerName, farmer1.name);

    // FPO 1 creates a lot attributed to Farmer 2
    const createLotRes2 = await invokeController(createMemberLot, {
      user: { id: fpo1._id.toString(), role: "fpo" },
      body: {
        name: "Pimpalgaon Hybrid Tomatoes",
        category: "vegetables",
        description: "Plump ripe tomatoes from Niphad cluster",
        price: 32,
        unit: "kg",
        quantity: 1200,
        minOrderQuantity: 50,
        memberFarmerId: farmer2._id.toString(),
        qualityGrade: "Grade A",
      },
    } as any);
    assert.equal(createLotRes2.status, 201, "Aggregated lot 2 creation succeeded");
    const lot2 = createLotRes2.data.data;

    // FPO 1 attempts to create a lot attributing Farmer 3 (from FPO 2) -> must fail
    try {
      await invokeController(createMemberLot, {
        user: { id: fpo1._id.toString(), role: "fpo" },
        body: {
          name: "Baramati Sugarcane",
          category: "vegetables",
          description: "Illegal attempt to aggregate from another FPO's farmer",
          price: 15,
          unit: "kg",
          quantity: 5000,
          memberFarmerId: farmer3._id.toString(),
        },
      } as any);
      assert.fail("Should reject lot creation attributing a non-member farmer");
    } catch (err: any) {
      assert.ok(err.statusCode === 403 || err.message.includes("not a member"), "Should enforce member validation");
    }

    // Query aggregated lots for FPO 1
    const lotsRes1 = await invokeController(getAggregatedLots, {
      user: { id: fpo1._id.toString(), role: "fpo" },
      query: {},
    } as any);
    assert.equal(lotsRes1.status, 200);
    assert.equal(lotsRes1.data.data.length, 2, "FPO 1 aggregated lots must contain 2 items");

    // Query aggregated lots for FPO 2 -> should be 0
    const lotsRes2 = await invokeController(getAggregatedLots, {
      user: { id: fpo2._id.toString(), role: "fpo" },
      query: {},
    } as any);
    assert.equal(lotsRes2.status, 200);
    assert.equal(lotsRes2.data.data.length, 0, "FPO 2 lots must be empty and isolated");

    // -------------------------------------------------------------------------
    // SUBTEST 4: Aggregated Buyer Offers & Atomic Acceptance
    // -------------------------------------------------------------------------
    console.log("  ↳ Subtest 4: Aggregated offers negotiation and atomic acceptance...");

    // Buyer places offer on Lot 1 (attributed to Farmer 1)
    const offer1 = await Offer.create({
      listingId: lot1._id.toString(),
      listingTitle: lot1.name,
      buyerId: buyer._id.toString(),
      buyerName: buyer.name,
      buyerPhone: buyer.phone,
      farmerId: lot1.farmerId,
      farmerName: lot1.farmerName,
      offerPrice: 25,
      originalPrice: lot1.price,
      offerQuantity: 500,
      unit: "kg",
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000),
    });

    // FPO 1 queries aggregated offers inbox
    const offersRes1 = await invokeController(getAggregatedOffers, {
      user: { id: fpo1._id.toString(), role: "fpo" },
      query: {},
    } as any);
    assert.equal(offersRes1.status, 200);
    assert.equal(offersRes1.data.data.length, 1, "FPO 1 must see offer for its member's lot");
    assert.equal(offersRes1.data.data[0]._id.toString(), offer1._id.toString());

    // FPO 2 queries aggregated offers inbox -> must be 0
    const offersRes2 = await invokeController(getAggregatedOffers, {
      user: { id: fpo2._id.toString(), role: "fpo" },
      query: {},
    } as any);
    assert.equal(offersRes2.status, 200);
    assert.equal(offersRes2.data.data.length, 0, "FPO 2 must see 0 offers");

    // FPO 1 accepts the offer on behalf of Farmer 1
    const respondRes = await invokeController(respondToOffer, {
      user: { id: fpo1._id.toString(), role: "fpo" },
      params: { id: offer1._id.toString() },
      body: { action: "accept" },
    } as any);
    assert.equal(respondRes.status, 200, "FPO 1 should be authorized to accept member's offer");
    assert.equal(respondRes.data.data.offer.status, "accepted");
    const createdOrder = respondRes.data.data.order;
    assert.ok(createdOrder?._id || createdOrder?.id, "Accepted offer must generate an Order");

    // Check that listing quantity was atomically decremented
    const updatedLot1 = await Listing.findById(lot1._id);
    assert.equal(updatedLot1?.quantity, 2000, "Stock should decrement from 2500 to 2000 kg atomically");

    // -------------------------------------------------------------------------
    // SUBTEST 5: Aggregated Order Tracking & FPO Dashboard Stats
    // -------------------------------------------------------------------------
    console.log("  ↳ Subtest 5: Aggregated order tracking and command center stats...");

    const createdOrderId = (createdOrder?._id || createdOrder?.id).toString();

    // FPO 1 gets aggregated orders
    const ordersRes1 = await invokeController(getAggregatedOrders, {
      user: { id: fpo1._id.toString(), role: "fpo" },
      query: {},
    } as any);
    assert.equal(ordersRes1.status, 200);
    assert.equal(ordersRes1.data.data.length, 1, "FPO 1 must see the order created from member's lot");
    assert.equal(ordersRes1.data.data[0]._id.toString(), createdOrderId);

    // FPO 1 updates order status to "processing" then "shipped" per order state machine
    const updateOrderRes1 = await invokeController(updateOrderStatus, {
      user: { id: fpo1._id.toString(), role: "fpo" },
      params: { id: createdOrderId },
      body: { status: "processing" },
    } as any);
    assert.equal(updateOrderRes1.status, 200);
    assert.equal(updateOrderRes1.data.data.status, "processing");

    const updateOrderRes2 = await invokeController(updateOrderStatus, {
      user: { id: fpo1._id.toString(), role: "fpo" },
      params: { id: createdOrderId },
      body: { status: "shipped" },
    } as any);
    assert.equal(updateOrderRes2.status, 200);
    assert.equal(updateOrderRes2.data.data.status, "shipped");

    // FPO 1 checks command center stats
    const statsRes1 = await invokeController(getFPOStats, {
      user: { id: fpo1._id.toString(), role: "fpo" },
    } as any);
    assert.equal(statsRes1.status, 200);
    const stats = statsRes1.data.data;
    assert.equal(stats.totalMembersCount, 2, "Stats should show 2 registered members");
    assert.equal(stats.activeLotsCount, 2, "Stats should show 2 active lots");
    assert.equal(stats.totalStockVolumeKg, 3200, "Total available pooled stock (2000 kg onions + 1200 kg tomatoes)");
    assert.equal(stats.activeOrdersCount, 1, "Stats should show 1 active order");
    assert.equal(stats.totalRevenue, 12500, "Stats revenue should match order total (500 kg @ Rs 25)");

    // -------------------------------------------------------------------------
    // SUBTEST 6: Member Unlinking & Cleanup
    // -------------------------------------------------------------------------
    console.log("  ↳ Subtest 6: Unlink member farmer and verify count update...");

    const removeRes = await invokeController(removeMember, {
      user: { id: fpo1._id.toString(), role: "fpo" },
      params: { id: farmer2._id.toString() },
    } as any);
    assert.equal(removeRes.status, 200, "Unlinking member should succeed");

    const unlinkedFarmer2 = await User.findById(farmer2._id);
    assert.equal(unlinkedFarmer2?.fpoId, undefined, "Farmer 2 fpoId should be cleared");

    const updatedFPO1 = await User.findById(fpo1._id);
    assert.equal(updatedFPO1?.fpoProfile?.totalMembersCount, 1, "FPO 1 member count should decrease to 1");

    console.log("  ✅ T11.6: All 6 subtests in FPO Multi-Farm Aggregation suite passed successfully!");
  } finally {
    // Cleanup created test records
    await User.deleteMany({
      _id: { $in: [fpo1._id, fpo2._id, farmer1._id, farmer2._id, farmer3._id, buyer._id] },
    });
    await Listing.deleteMany({ fpoId: { $in: [fpo1._id.toString(), fpo2._id.toString()] } });
    await Offer.deleteMany({ buyerId: buyer._id });
    await Order.deleteMany({ buyerId: buyer._id });
  }
}
