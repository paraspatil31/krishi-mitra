import assert from "node:assert/strict";
import Order from "../models/Order";
import Payment from "../models/Payment";
import User from "../models/User";
import { webhook as handleWebhook } from "../controllers/payment.controller";
import { invokeController } from "./test-utils";

export async function runWebhookIdempotencyTests() {
  console.log("\n🧪 Running T7.2: Payment Webhook Idempotency Tests...");

  const timestamp = Date.now();
  const testPhone = `9199${timestamp.toString().slice(-6)}`;
  const rzpOrderId = `order_test_${timestamp}`;
  const rzpPaymentId = `pay_test_${timestamp}`;
  const duplicateEventId = `evt_test_${timestamp}`;

  // 1. Setup mock users
  const farmer = await User.create({
    name: `Webhook Farmer ${timestamp}`,
    phone: testPhone,
    passwordHash: "mock_hash_for_test",
    role: "farmer",
  });

  const buyer = await User.create({
    name: `Webhook Buyer ${timestamp}`,
    phone: `9188${timestamp.toString().slice(-6)}`,
    passwordHash: "mock_hash_for_test",
    role: "buyer",
  });

  // 2. Setup mock order
  const order = await Order.create({
    buyerId: buyer._id.toString(),
    buyerName: buyer.name,
    farmerId: farmer._id.toString(),
    farmerName: farmer.name,
    items: [
      {
        productId: "mock_prod_id",
        productName: "Organic Tomatoes",
        quantity: 5,
        unit: "kg",
        price: 50,
      },
    ],
    total: 250,
    status: "pending",
    deliveryAddress: "Test Farm Gate, Pune",
  });

  // 3. Setup mock payment in 'initiated' state
  const payment = await Payment.create({
    orderId: order._id,
    buyerId: buyer._id.toString(),
    farmerId: farmer._id.toString(),
    razorpayOrderId: rzpOrderId,
    amount: 250,
    amountPaise: 25000,
    currency: "INR",
    status: "initiated",
    gatewayEventIds: [],
    webhookEventLog: [],
  });

  try {
    // -------------------------------------------------------------------------
    // SUBTEST 1: First delivery of payment.captured event
    // -------------------------------------------------------------------------
    console.log("  ↳ Subtest 1: Initial delivery of payment.captured webhook...");

    const initialWebhookReq: any = {
      headers: {
        "x-razorpay-event-id": duplicateEventId,
      },
      body: {
        entity: "event",
        account_id: "acc_test",
        event: "payment.captured",
        id: duplicateEventId,
        payload: {
          payment: {
            entity: {
              id: rzpPaymentId,
              order_id: rzpOrderId,
              status: "captured",
              amount: 25000,
              currency: "INR",
              notes: {
                orderId: order._id.toString(),
              },
            },
          },
        },
      },
    };

    const res1 = await invokeController(handleWebhook, initialWebhookReq);
    assert.equal(res1.status, 200, "Initial webhook delivery should return HTTP 200");

    // Verify DB mutations
    const updatedPayment1 = await Payment.findById(payment._id);
    assert.ok(updatedPayment1, "Payment record should exist");
    assert.equal(updatedPayment1.status, "captured", "Payment status must transition to 'captured'");
    assert.equal(updatedPayment1.razorpayPaymentId, rzpPaymentId, "Payment ID must be updated");
    assert.equal(updatedPayment1.gatewayEventIds.length, 1, "gatewayEventIds must have 1 entry");
    assert.ok(
      updatedPayment1.gatewayEventIds.includes(duplicateEventId),
      "gatewayEventIds must include the event ID"
    );
    assert.equal(updatedPayment1.webhookEventLog.length, 1, "webhookEventLog must have 1 entry");

    const updatedOrder1 = await Order.findById(order._id);
    assert.equal(updatedOrder1?.status, "confirmed", "Linked order status must advance to 'confirmed'");

    console.log("  ✅ Subtest 1 PASSED: Payment captured, event ID logged, order confirmed.");

    // -------------------------------------------------------------------------
    // SUBTEST 2: Duplicate delivery with exact same event ID (Hard Rule 5)
    // -------------------------------------------------------------------------
    console.log("  ↳ Subtest 2: Duplicate delivery with identical event ID...");

    const duplicateWebhookReq: any = {
      headers: {
        "x-razorpay-event-id": duplicateEventId,
      },
      body: {
        entity: "event",
        account_id: "acc_test",
        event: "payment.captured",
        id: duplicateEventId,
        payload: {
          payment: {
            entity: {
              id: rzpPaymentId,
              order_id: rzpOrderId,
              status: "captured",
              amount: 25000,
              currency: "INR",
              notes: {
                orderId: order._id.toString(),
              },
            },
          },
        },
      },
    };

    const res2 = await invokeController(handleWebhook, duplicateWebhookReq);
    assert.equal(res2.status, 200, "Duplicate delivery must return HTTP 200");
    assert.equal(res2.data.status, "ok", "Response status should be 'ok'");
    assert.equal(
      res2.data.message,
      "Duplicate event skipped",
      "Response message should clearly declare 'Duplicate event skipped'"
    );

    // Verify no redundant mutations or duplicate audit entries
    const updatedPayment2 = await Payment.findById(payment._id);
    assert.equal(
      updatedPayment2?.gatewayEventIds.length,
      1,
      "gatewayEventIds must NOT contain duplicate IDs"
    );
    assert.equal(
      updatedPayment2?.webhookEventLog.length,
      1,
      "webhookEventLog must NOT duplicate the audit trail"
    );
    assert.equal(updatedPayment2?.status, "captured", "Payment status must remain 'captured'");

    console.log("  ✅ Subtest 2 PASSED: Gateway event deduplication active, zero duplicate mutations.");

    // -------------------------------------------------------------------------
    // SUBTEST 3: Unrelated / unknown payment record handling
    // -------------------------------------------------------------------------
    console.log("  ↳ Subtest 3: Handling unknown payment event gracefully...");

    const unknownWebhookReq: any = {
      headers: {
        "x-razorpay-event-id": `evt_unknown_${timestamp}`,
      },
      body: {
        entity: "event",
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_unknown",
              order_id: "order_non_existent_123456",
            },
          },
        },
      },
    };

    const res3 = await invokeController(handleWebhook, unknownWebhookReq);
    assert.equal(res3.status, 200, "Unknown event should return HTTP 200");
    assert.equal(res3.data.status, "ignored", "Unknown event status should be 'ignored'");

    console.log("  ✅ Subtest 3 PASSED: Unknown event handled safely without errors.");

  } finally {
    // Cleanup fixtures created in this run
    await Payment.deleteMany({ razorpayOrderId: rzpOrderId });
    await Order.findByIdAndDelete(order._id);
    await User.findByIdAndDelete(farmer._id);
    await User.findByIdAndDelete(buyer._id);
  }
}
