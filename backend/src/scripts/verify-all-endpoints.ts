import dotenv from "dotenv";
dotenv.config();

import axios, { AxiosInstance } from "axios";
import { signAccessToken } from "../utils/jwt";

interface EndpointTestResult {
  group: string;
  name: string;
  method: string;
  path: string;
  expectedStatus: number | number[];
  actualStatus: number;
  success: boolean;
  notes?: string;
}

const results: EndpointTestResult[] = [];
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5000/api";

function logResult(r: EndpointTestResult) {
  results.push(r);
  const icon = r.success ? "✅" : "❌";
  console.log(
    `  ${icon} [${r.group}] ${r.method.padEnd(6)} ${r.path.padEnd(35)} -> HTTP ${r.actualStatus} (Expected: ${Array.isArray(r.expectedStatus) ? r.expectedStatus.join("/") : r.expectedStatus}) ${r.notes ? `(${r.notes})` : ""}`
  );
}

async function runEndpointAudit() {
  console.log("\n=================================================================");
  console.log("🚀 KRISHIBAZAAR END-TO-END ENDPOINT & INCONSISTENCY AUDIT SUITE");
  console.log("=================================================================\n");

  const unauthClient = axios.create({ baseURL: BASE_URL, validateStatus: () => true, timeout: 8000 });

  // 1. Unauthenticated / Public Endpoints
  console.log("1️⃣ Testing Public & Unauthenticated Endpoints...");
  {
    const r1 = await unauthClient.get("/health");
    logResult({
      group: "Public",
      name: "Health Check",
      method: "GET",
      path: "/health",
      expectedStatus: 200,
      actualStatus: r1.status,
      success: r1.status === 200,
      notes: r1.data?.status,
    });

    const r2 = await unauthClient.get("/listings?limit=2");
    logResult({
      group: "Public",
      name: "Public Listings",
      method: "GET",
      path: "/listings",
      expectedStatus: 200,
      actualStatus: r2.status,
      success: r2.status === 200,
      notes: `${r2.data?.data?.length || 0} listings`,
    });

    const r3 = await unauthClient.get("/weather?district=Pune");
    logResult({
      group: "Public",
      name: "Weather Forecast",
      method: "GET",
      path: "/weather",
      expectedStatus: 200,
      actualStatus: r3.status,
      success: r3.status === 200,
    });

    const r4 = await unauthClient.get("/weather/alerts?district=Pune");
    logResult({
      group: "Public",
      name: "Weather Alerts",
      method: "GET",
      path: "/weather/alerts",
      expectedStatus: 200,
      actualStatus: r4.status,
      success: r4.status === 200,
    });

    const r5 = await unauthClient.get("/location/search?q=Nashik");
    logResult({
      group: "Public",
      name: "Location Search",
      method: "GET",
      path: "/location/search",
      expectedStatus: 200,
      actualStatus: r5.status,
      success: r5.status === 200,
    });

    const r6 = await unauthClient.get("/location/reverse?lat=19.9975&lng=73.7898");
    logResult({
      group: "Public",
      name: "Location Reverse Geocode",
      method: "GET",
      path: "/location/reverse",
      expectedStatus: 200,
      actualStatus: r6.status,
      success: r6.status === 200,
    });
  }

  // 2. Authentication & Test Users Setup
  console.log("\n2️⃣ Authenticating Test Actors (Farmer, Household, Business, Admin)...");
  const ts = Date.now();
  const farmerData = { phone: `98000${ts.toString().slice(-5)}`, password: "password123", name: "Audit Farmer", role: "farmer", district: "Nashik" };
  const householdData = { phone: `98001${ts.toString().slice(-5)}`, password: "password123", name: "Audit Household", role: "buyer", buyerType: "household", district: "Pune" };
  const businessData = { phone: `98002${ts.toString().slice(-5)}`, password: "password123", name: "Audit Business", role: "buyer", buyerType: "business", district: "Mumbai" };

  // Signup test users
  const farmerSignup = await unauthClient.post("/auth/signup", farmerData);
  const farmerToken = farmerSignup.data?.data?.accessToken || farmerSignup.data?.token;
  logResult({
    group: "Auth",
    name: "Farmer Signup",
    method: "POST",
    path: "/auth/signup",
    expectedStatus: 201,
    actualStatus: farmerSignup.status,
    success: farmerSignup.status === 201 && Boolean(farmerToken),
  });

  const householdSignup = await unauthClient.post("/auth/signup", householdData);
  const householdToken = householdSignup.data?.data?.accessToken || householdSignup.data?.token;
  logResult({
    group: "Auth",
    name: "Household Buyer Signup",
    method: "POST",
    path: "/auth/signup",
    expectedStatus: 201,
    actualStatus: householdSignup.status,
    success: householdSignup.status === 201 && Boolean(householdToken),
  });

  const businessSignup = await unauthClient.post("/auth/signup", businessData);
  const businessToken = businessSignup.data?.data?.accessToken || businessSignup.data?.token;
  logResult({
    group: "Auth",
    name: "Business Buyer Signup",
    method: "POST",
    path: "/auth/signup",
    expectedStatus: 201,
    actualStatus: businessSignup.status,
    success: businessSignup.status === 201 && Boolean(businessToken),
  });

  // Login test
  const farmerLogin = await unauthClient.post("/auth/login", { phone: farmerData.phone, password: farmerData.password });
  logResult({
    group: "Auth",
    name: "Farmer Login",
    method: "POST",
    path: "/auth/login",
    expectedStatus: 200,
    actualStatus: farmerLogin.status,
    success: farmerLogin.status === 200,
  });

  const farmerClient = axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${farmerToken}` },
    validateStatus: () => true,
    timeout: 8000,
  });

  const householdClient = axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${householdToken}` },
    validateStatus: () => true,
    timeout: 8000,
  });

  const businessClient = axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${businessToken}` },
    validateStatus: () => true,
    timeout: 8000,
  });

  // 3. User Profile & Settings Endpoints
  console.log("\n3️⃣ Testing User Profile & Settings Endpoints...");
  {
    const meRes = await farmerClient.get("/auth/me");
    logResult({
      group: "Settings",
      name: "Get Current User Profile (/me)",
      method: "GET",
      path: "/auth/me",
      expectedStatus: 200,
      actualStatus: meRes.status,
      success: meRes.status === 200 && meRes.data?.data?.name === farmerData.name,
    });

    const updateProfileRes = await farmerClient.patch("/auth/profile", {
      farmProfile: { farmName: "Green Valley Farms", landSizeAcres: 12, organicCertified: true },
    });
    logResult({
      group: "Settings",
      name: "Update Profile (/profile)",
      method: "PATCH",
      path: "/auth/profile",
      expectedStatus: 200,
      actualStatus: updateProfileRes.status,
      success: updateProfileRes.status === 200 && updateProfileRes.data?.data?.farmProfile?.farmName === "Green Valley Farms",
    });

    const updateSettingsRes = await farmerClient.patch("/auth/settings", {
      settings: { language: "mr", unit: "quintal", notifications: { weatherAlerts: true, orderUpdates: true } },
    });
    logResult({
      group: "Settings",
      name: "Update Settings (/settings)",
      method: "PATCH",
      path: "/auth/settings",
      expectedStatus: 200,
      actualStatus: updateSettingsRes.status,
      success:
        updateSettingsRes.status === 200 &&
        (updateSettingsRes.data?.data?.settings?.language === "mr" ||
          updateSettingsRes.data?.data?.preferredLanguage === "mr" ||
          updateSettingsRes.data?.success === true),
    });

    const reportIssueRes = await farmerClient.post("/auth/support/report", {
      category: "Weather Sync",
      subject: "Audit Test Subject",
      message: "Testing support reporting flow.",
    });
    logResult({
      group: "Settings",
      name: "Submit Support Ticket",
      method: "POST",
      path: "/auth/support/report",
      expectedStatus: 200,
      actualStatus: reportIssueRes.status,
      success: reportIssueRes.status === 200,
    });
  }

  // 4. Farmer Listing Management
  console.log("\n4️⃣ Testing Farmer Listing CRUD & RBAC Security...");
  let createdListingId = "";
  {
    // Farmer creates listing
    const createRes = await farmerClient.post("/listings", {
      name: "Organic Alphonso Mangoes",
      category: "Fruits",
      price: 650,
      quantity: 100,
      unit: "dozen",
      description: "Premium export quality Alphonso mangoes direct from orchard",
      harvestDate: new Date().toISOString(),
      location: "Nashik, Maharashtra",
      status: "active",
      geo: { type: "Point", coordinates: [73.7898, 19.9975] },
    });
    createdListingId = createRes.data?.data?._id || createRes.data?.data?.id;
    logResult({
      group: "Listings",
      name: "Farmer Create Listing",
      method: "POST",
      path: "/listings",
      expectedStatus: 201,
      actualStatus: createRes.status,
      success: createRes.status === 201 && Boolean(createdListingId),
    });

    // Farmer gets own listings (/mine)
    const mineRes = await farmerClient.get("/listings/mine");
    logResult({
      group: "Listings",
      name: "Farmer Get Own Listings (/mine)",
      method: "GET",
      path: "/listings/mine",
      expectedStatus: 200,
      actualStatus: mineRes.status,
      success: mineRes.status === 200 && Array.isArray(mineRes.data?.data),
    });

    // Public gets specific listing
    const getOneRes = await unauthClient.get(`/listings/${createdListingId}`);
    logResult({
      group: "Listings",
      name: "Get Single Listing Details",
      method: "GET",
      path: `/listings/:id`,
      expectedStatus: 200,
      actualStatus: getOneRes.status,
      success: getOneRes.status === 200 && (getOneRes.data?.data?.name === "Organic Alphonso Mangoes"),
    });

    // RBAC check: Buyer must be forbidden from creating listings
    const buyerCreateRes = await householdClient.post("/listings", {
      name: "Illicit Buyer Listing",
      category: "Fruits",
      price: 100,
      quantity: 10,
    });
    logResult({
      group: "RBAC",
      name: "Buyer Forbidden from Listing Creation",
      method: "POST",
      path: "/listings",
      expectedStatus: 403,
      actualStatus: buyerCreateRes.status,
      success: buyerCreateRes.status === 403,
      notes: "Hard rule #3: role enforced server-side",
    });

    // Blockchain provenance verification
    const ledgerRes = await unauthClient.get(`/ledger/${createdListingId}`);
    logResult({
      group: "Ledger",
      name: "Blockchain Provenance Lookup",
      method: "GET",
      path: `/ledger/:listingId`,
      expectedStatus: 200,
      actualStatus: ledgerRes.status,
      success: ledgerRes.status === 200 && Boolean(ledgerRes.data?.data?.txHash),
      notes: `TxHash: ${ledgerRes.data?.data?.txHash?.slice(0, 10)}...`,
    });
  }

  // 5. Orders & Transactions
  console.log("\n5️⃣ Testing Order Creation, Transaction Atomic Decrement & State Machine...");
  let createdOrderId = "";
  {
    // Buyer places order
    const orderRes = await householdClient.post("/orders", {
      items: [{ productId: createdListingId, quantity: 5 }],
      deliveryAddress: {
        fullName: "Audit Buyer",
        street: "MG Road, Flat 402",
        district: "Pune",
        state: "Maharashtra",
        pincode: "411001",
        phone: householdData.phone,
      },
    });
    createdOrderId = orderRes.data?.data?._id || orderRes.data?.data?.id;
    logResult({
      group: "Orders",
      name: "Buyer Create Order",
      method: "POST",
      path: "/orders",
      expectedStatus: 201,
      actualStatus: orderRes.status,
      success: orderRes.status === 201 && Boolean(createdOrderId),
      notes: `Total: ₹${orderRes.data?.data?.total}`,
    });

    // Check atomic stock decrement on listing
    const listingCheck = await unauthClient.get(`/listings/${createdListingId}`);
    const remainingQty = listingCheck.data?.data?.quantity;
    logResult({
      group: "Orders",
      name: "Atomic Stock Decrement (100 -> 95)",
      method: "GET",
      path: "/listings/:id",
      expectedStatus: 200,
      actualStatus: listingCheck.status,
      success: remainingQty === 95,
      notes: `Remaining quantity: ${remainingQty}`,
    });

    // Order state machine: Farmer confirms order (pending -> confirmed)
    const confirmRes = await farmerClient.patch(`/orders/${createdOrderId}/status`, { status: "confirmed" });
    logResult({
      group: "Orders",
      name: "Farmer Advances Order: confirmed",
      method: "PATCH",
      path: "/orders/:id/status",
      expectedStatus: 200,
      actualStatus: confirmRes.status,
      success: confirmRes.status === 200 && confirmRes.data?.data?.status === "confirmed",
    });

    // Farmer advances to processing (confirmed -> processing)
    const procRes = await farmerClient.patch(`/orders/${createdOrderId}/status`, { status: "processing" });
    logResult({
      group: "Orders",
      name: "Farmer Advances Order: processing",
      method: "PATCH",
      path: "/orders/:id/status",
      expectedStatus: 200,
      actualStatus: procRes.status,
      success: procRes.status === 200 && procRes.data?.data?.status === "processing",
    });

    // Invalid transition check: skipping shipped and jumping straight to delivered by farmer
    const invalidTrans = await farmerClient.patch(`/orders/${createdOrderId}/status`, { status: "delivered" });
    logResult({
      group: "Orders",
      name: "Reject Illegal Status Jump / Role Authority",
      method: "PATCH",
      path: "/orders/:id/status",
      expectedStatus: [400, 403],
      actualStatus: invalidTrans.status,
      success: invalidTrans.status === 400 || invalidTrans.status === 403,
      notes: invalidTrans.data?.message?.slice(0, 35),
    });

    // Farmer advances to shipped
    const shipRes = await farmerClient.patch(`/orders/${createdOrderId}/status`, { status: "shipped" });
    logResult({
      group: "Orders",
      name: "Farmer Advances Order: shipped",
      method: "PATCH",
      path: "/orders/:id/status",
      expectedStatus: 200,
      actualStatus: shipRes.status,
      success: shipRes.status === 200 && shipRes.data?.data?.status === "shipped",
    });

    // Buyer confirms delivery
    const deliverRes = await householdClient.patch(`/orders/${createdOrderId}/status`, { status: "delivered" });
    logResult({
      group: "Orders",
      name: "Buyer Confirms Delivery: delivered",
      method: "PATCH",
      path: "/orders/:id/status",
      expectedStatus: 200,
      actualStatus: deliverRes.status,
      success: deliverRes.status === 200 && deliverRes.data?.data?.status === "delivered",
    });
  }

  // 6. Payments & Escrow
  console.log("\n6️⃣ Testing Payment Initiation, Gateway Mock/SDK & Escrow Release...");
  {
    const initPay = await householdClient.post("/payments/initiate", { orderId: createdOrderId });
    const razorpayOrderId = initPay.data?.payment?.razorpayOrderId;
    logResult({
      group: "Payments",
      name: "Initiate Escrow Payment",
      method: "POST",
      path: "/payments/initiate",
      expectedStatus: [200, 201],
      actualStatus: initPay.status,
      success: initPay.status === 200 || initPay.status === 201,
      notes: initPay.data?.payment?.id ? `Payment ID: ${initPay.data?.payment?.id}` : undefined,
    });

    // Verify payment (simulating frontend checkout completion)
    const verifyPay = await householdClient.post("/payments/verify", {
      orderId: createdOrderId,
      razorpayOrderId: razorpayOrderId || "order_mock_test",
      razorpayPaymentId: "pay_mock_12345",
      razorpaySignature: "mock_signature_valid",
    });
    logResult({
      group: "Payments",
      name: "Verify & Capture Escrow Payment",
      method: "POST",
      path: "/payments/verify",
      expectedStatus: 200,
      actualStatus: verifyPay.status,
      success: verifyPay.status === 200 && verifyPay.data?.data?.payment?.status === "captured",
    });

    const getPay = await householdClient.get(`/payments/order/${createdOrderId}`);
    logResult({
      group: "Payments",
      name: "Get Payment By Order ID",
      method: "GET",
      path: "/payments/order/:orderId",
      expectedStatus: 200,
      actualStatus: getPay.status,
      success: getPay.status === 200,
    });

    const releasePay = await householdClient.post(`/payments/release/${createdOrderId}`);
    logResult({
      group: "Payments",
      name: "Escrow Release to Farmer",
      method: "POST",
      path: "/payments/release/:orderId",
      expectedStatus: 200,
      actualStatus: releasePay.status,
      success: releasePay.status === 200,
      notes: releasePay.data?.message,
    });
  }

  // 7. Wholesale Segregation (Mandi, Storage, Haats, Bulk RFQs)
  console.log("\n7️⃣ Testing Wholesale B2B vs Household Buyer Segregation...");
  {
    // Business Buyer has access to Mandi Rates
    const mandiBiz = await businessClient.get("/mandi-prices?limit=5");
    logResult({
      group: "Wholesale",
      name: "Business Buyer Access to Mandi Rates",
      method: "GET",
      path: "/mandi-prices",
      expectedStatus: 200,
      actualStatus: mandiBiz.status,
      success: mandiBiz.status === 200,
    });

    // Farmer has access to Mandi Rates
    const mandiFarmer = await farmerClient.get("/mandi-prices?limit=5");
    logResult({
      group: "Wholesale",
      name: "Farmer Access to Mandi Rates",
      method: "GET",
      path: "/mandi-prices",
      expectedStatus: 200,
      actualStatus: mandiFarmer.status,
      success: mandiFarmer.status === 200,
    });

    // Household Buyer must be FORBIDDEN (403) from Mandi Rates
    const mandiHousehold = await householdClient.get("/mandi-prices");
    logResult({
      group: "Wholesale",
      name: "Household Buyer FORBIDDEN from Mandi Rates",
      method: "GET",
      path: "/mandi-prices",
      expectedStatus: 403,
      actualStatus: mandiHousehold.status,
      success: mandiHousehold.status === 403,
      notes: "Strict role segregation active",
    });

    // Storage Facilities: Business allowed, Household forbidden
    const storageBiz = await businessClient.get("/storage");
    logResult({
      group: "Wholesale",
      name: "Business Buyer Access to Cold Storage",
      method: "GET",
      path: "/storage",
      expectedStatus: 200,
      actualStatus: storageBiz.status,
      success: storageBiz.status === 200,
    });

    const storageHousehold = await householdClient.get("/storage");
    logResult({
      group: "Wholesale",
      name: "Household Buyer FORBIDDEN from Cold Storage",
      method: "GET",
      path: "/storage",
      expectedStatus: 403,
      actualStatus: storageHousehold.status,
      success: storageHousehold.status === 403,
    });

    // Nearby Markets: Business allowed, Household forbidden
    const marketsBiz = await businessClient.get("/markets/nearby?district=Pune");
    logResult({
      group: "Wholesale",
      name: "Business Buyer Access to Nearby Mandis",
      method: "GET",
      path: "/markets/nearby",
      expectedStatus: 200,
      actualStatus: marketsBiz.status,
      success: marketsBiz.status === 200,
    });

    const marketsHousehold = await householdClient.get("/markets/nearby?district=Pune");
    logResult({
      group: "Wholesale",
      name: "Household Buyer FORBIDDEN from Nearby Mandis",
      method: "GET",
      path: "/markets/nearby",
      expectedStatus: 403,
      actualStatus: marketsHousehold.status,
      success: marketsHousehold.status === 403,
    });
  }

  // 8. Bulk Procurement RFQs & Quotations
  console.log("\n8️⃣ Testing Bulk Procurement RFQs & Farmer Quotations...");
  let rfqId = "";
  {
    // Business buyer posts RFQ (needs businessProfile with businessName and address)
    await businessClient.patch("/auth/profile", {
      businessProfile: {
        businessName: "Kalyan Supermarkets Pvt Ltd",
        businessType: "Retail Chain",
        gstin: "27AAECK1234F1Z5",
        businessAddress: "Sector 18, Vashi APMC, Navi Mumbai",
      },
    });

    const rfqRes = await businessClient.post("/bulk-requirements", {
      product: "Fresh Tomato",
      quantity: 50,
      unit: "quintals",
      targetPricePerUnit: 2400,
      requiredByDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      deliveryLocation: {
        address: "Vashi APMC Yard, Gate 2",
        district: "Navi Mumbai",
        state: "Maharashtra",
        pincode: "400703",
      },
      notes: "Looking for firm, hybrid red variety.",
    });
    rfqId = rfqRes.data?.data?._id || rfqRes.data?.data?.id;
    logResult({
      group: "Bulk RFQ",
      name: "Business Buyer Posts Bulk RFQ",
      method: "POST",
      path: "/bulk-requirements",
      expectedStatus: 201,
      actualStatus: rfqRes.status,
      success: rfqRes.status === 201 && Boolean(rfqId),
    });

    // Farmers browse open RFQs
    const openRfqs = await farmerClient.get("/bulk-requirements/open");
    logResult({
      group: "Bulk RFQ",
      name: "Farmer Browses Open RFQs",
      method: "GET",
      path: "/bulk-requirements/open",
      expectedStatus: 200,
      actualStatus: openRfqs.status,
      success: openRfqs.status === 200 && Array.isArray(openRfqs.data?.data),
    });

    // Farmer submits quotation
    const quoteRes = await farmerClient.post(`/bulk-requirements/${rfqId}/quote`, {
      pricePerUnit: 2350,
      quantityOffered: 50,
      availableDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      notes: "Direct harvest from Nashik farm, A-grade firmness",
    });
    logResult({
      group: "Bulk RFQ",
      name: "Farmer Submits Quotation to RFQ",
      method: "POST",
      path: `/bulk-requirements/:id/quote`,
      expectedStatus: [200, 201],
      actualStatus: quoteRes.status,
      success: (quoteRes.status === 200 || quoteRes.status === 201) && quoteRes.data?.data?.quotationsCount > 0,
    });
  }

  // 9. Offers & Direct Negotiations
  console.log("\n9️⃣ Testing Price Offers & Negotiations...");
  let offerId = "";
  {
    const createOffer = await householdClient.post("/offers", {
      listingId: createdListingId,
      offerPrice: 600,
      offerQuantity: 5,
      note: "Looking to buy 5 dozen for family function",
    });
    offerId = createOffer.data?.data?._id || createOffer.data?.data?.id;
    logResult({
      group: "Offers",
      name: "Buyer Submits Price Offer",
      method: "POST",
      path: "/offers",
      expectedStatus: 201,
      actualStatus: createOffer.status,
      success: createOffer.status === 201 && Boolean(offerId),
    });

    // Farmer responds: accepts offer
    const respondOffer = await farmerClient.patch(`/offers/${offerId}/respond`, {
      action: "accept",
      farmerNote: "Accepted for immediate packing",
    });
    logResult({
      group: "Offers",
      name: "Farmer Accepts Price Offer",
      method: "PATCH",
      path: `/offers/:id/respond`,
      expectedStatus: 200,
      actualStatus: respondOffer.status,
      success: respondOffer.status === 200 && respondOffer.data?.data?.offer?.status === "accepted",
    });
  }

  // 10. In-App Notifications
  console.log("\n🔟 Testing In-App Notification Center...");
  {
    const notifs = await farmerClient.get("/notifications");
    logResult({
      group: "Notifications",
      name: "Get Notifications Inbox",
      method: "GET",
      path: "/notifications",
      expectedStatus: 200,
      actualStatus: notifs.status,
      success: notifs.status === 200 && Array.isArray(notifs.data?.data?.notifications),
      notes: `${notifs.data?.data?.notifications?.length || 0} notifications for farmer`,
    });

    const markAllRead = await farmerClient.patch("/notifications/read-all");
    logResult({
      group: "Notifications",
      name: "Mark All Notifications As Read",
      method: "PATCH",
      path: "/notifications/read-all",
      expectedStatus: 200,
      actualStatus: markAllRead.status,
      success: markAllRead.status === 200,
    });
  }

  // 11. Reviews
  console.log("\n1️⃣1️⃣ Testing Reviews System...");
  {
    const reviewRes = await householdClient.post("/reviews", {
      orderId: createdOrderId,
      rating: 5,
      comment: "Crisp and juicy mangoes! Excellent packing by the producer.",
    });
    logResult({
      group: "Reviews",
      name: "Submit Post-Delivery Review",
      method: "POST",
      path: "/reviews",
      expectedStatus: 201,
      actualStatus: reviewRes.status,
      success: reviewRes.status === 201,
    });
  }

  // 12. Admin Security & Operations
  console.log("\n1️⃣2️⃣ Testing Admin RBAC Security & Platform Controls...");
  {
    // Non-admin attempting to access admin route must receive 403 Forbidden
    const unauthAdminRes = await householdClient.get("/admin/stats");
    logResult({
      group: "Admin",
      name: "Household Buyer FORBIDDEN from Admin Stats",
      method: "GET",
      path: "/admin/stats",
      expectedStatus: 403,
      actualStatus: unauthAdminRes.status,
      success: unauthAdminRes.status === 403,
    });

    const farmerAdminRes = await farmerClient.get("/admin/users");
    logResult({
      group: "Admin",
      name: "Farmer FORBIDDEN from Admin User Directory",
      method: "GET",
      path: "/admin/users",
      expectedStatus: 403,
      actualStatus: farmerAdminRes.status,
      success: farmerAdminRes.status === 403,
    });

    // Valid admin token
    const adminToken = signAccessToken({ sub: "60c72b2f9b1d8b2bad000001", role: "admin" });
    const adminClient = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${adminToken}` },
      validateStatus: () => true,
      timeout: 8000,
    });

    const statsRes = await adminClient.get("/admin/stats");
    logResult({
      group: "Admin",
      name: "Admin Platform Stats",
      method: "GET",
      path: "/admin/stats",
      expectedStatus: 200,
      actualStatus: statsRes.status,
      success: statsRes.status === 200 && typeof statsRes.data?.data?.users === "number",
    });

    const usersRes = await adminClient.get("/admin/users");
    logResult({
      group: "Admin",
      name: "Admin Users Directory",
      method: "GET",
      path: "/admin/users",
      expectedStatus: 200,
      actualStatus: usersRes.status,
      success: usersRes.status === 200 && Array.isArray(usersRes.data?.data),
    });

    const listingsRes = await adminClient.get("/admin/listings");
    logResult({
      group: "Admin",
      name: "Admin Listings Directory",
      method: "GET",
      path: "/admin/listings",
      expectedStatus: 200,
      actualStatus: listingsRes.status,
      success: listingsRes.status === 200 && Array.isArray(listingsRes.data?.data),
    });

    const ordersRes = await adminClient.get("/admin/orders");
    logResult({
      group: "Admin",
      name: "Admin Orders Directory",
      method: "GET",
      path: "/admin/orders",
      expectedStatus: 200,
      actualStatus: ordersRes.status,
      success: ordersRes.status === 200 && Array.isArray(ordersRes.data?.data),
    });
  }

  // Summary
  console.log("\n=================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`📊 FINAL AUDIT RESULT: ${passed}/${total} Endpoints Operational (${failed} Inconsistencies Found).`);
  console.log("=================================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

runEndpointAudit().catch((err) => {
  console.error("Audit runtime error:", err);
  process.exit(1);
});
