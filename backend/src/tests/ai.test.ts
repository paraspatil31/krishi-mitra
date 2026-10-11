import assert from "node:assert/strict";
import { AIService } from "../services/ai.service";
import { matchVoiceCommand, getVoiceLocaleConfig } from "../config/voiceCommands.locales";
import User from "../models/User";
import Order from "../models/Order";

export async function runAITests() {
  console.log("\n🧪 Running Phase 12 AI & Voice Assistant Tests...");

  // -------------------------------------------------------------
  // Test 1: Fallback Mode Safety — Must NEVER fabricate metrics
  // -------------------------------------------------------------
  console.log("  1. Testing offline fallback safety invariants...");
  const prevKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY; // Force offline fallback

  const fallbackResult = await AIService.diagnoseCropImage(
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...",
    "image/jpeg",
    "en"
  );

  assert.equal(fallbackResult.diagnosisSource, "basic_fallback", "Source must be basic_fallback");
  assert.equal(fallbackResult.confidence, undefined, "Fallback MUST NOT include confidence percentage");
  assert.equal(fallbackResult.qualityControl, undefined, "Fallback MUST NOT include quality control assessment");
  assert.equal(fallbackResult.remedies?.chemical, undefined, "Fallback MUST NOT recommend specific chemical remedies");
  assert.ok(fallbackResult.fallbackMessage, "Fallback must provide clear extension officer warning message");
  assert.ok(
    fallbackResult.fallbackMessage.includes("consult a local agricultural extension officer") ||
    fallbackResult.fallbackMessage.includes("Krishi Vigyan Kendra"),
    "Warning message must refer to extension officers or KVK"
  );

  // Restore key
  if (prevKey) process.env.GEMINI_API_KEY = prevKey;
  console.log("     ✓ Fallback safety verified: confidence, QC, and chemical remedies strictly omitted.");

  // -------------------------------------------------------------
  // Test 2: Assistant Chat Data Scoping (Hard Rule 3)
  // -------------------------------------------------------------
  console.log("  2. Testing assistant chat user data isolation...");
  const ts = Date.now();
  const userA = await User.create({
    name: `Farmer Alpha ${ts}`,
    phone: `9177${ts.toString().slice(-6)}`,
    passwordHash: "hash_for_test",
    role: "farmer",
  });

  const userB = await User.create({
    name: `Buyer Beta ${ts}`,
    phone: `9166${ts.toString().slice(-6)}`,
    passwordHash: "hash_for_test",
    role: "buyer",
  });

  const orderB = await Order.create({
    buyerId: userB._id.toString(),
    buyerName: userB.name,
    farmerId: "some_other_farmer",
    farmerName: "Other Farmer",
    items: [{ productId: "p1", productName: "Alphonso Mangoes", quantity: 10, unit: "kg", price: 200 }],
    total: 2000,
    status: "processing",
    deliveryAddress: "Mumbai, Maharashtra",
  });

  // User A asks about their orders — must NOT see User B's order
  const chatResponseUserA = await AIService.chatAssistant(
    "What is the status of my order?",
    [],
    userA._id.toString(),
    "farmer",
    "en"
  );

  assert.ok(chatResponseUserA.message, "Must return a response message");
  assert.ok(
    !chatResponseUserA.message.includes("Alphonso Mangoes"),
    "User A must never be told about User B's Alphonso Mangoes order"
  );
  assert.ok(
    !chatResponseUserA.message.includes("2000"),
    "User A must never see User B's order total"
  );

  // User B asks about their orders — MUST see their own order
  const chatResponseUserB = await AIService.chatAssistant(
    "my order status",
    [],
    userB._id.toString(),
    "buyer",
    "en"
  );

  assert.ok(
    chatResponseUserB.message.includes("Alphonso Mangoes") ||
    chatResponseUserB.message.includes("processing") ||
    chatResponseUserB.message.includes("2000"),
    "User B must see their own order summary"
  );
  console.log("     ✓ User-scoped data boundary verified: zero cross-user order leakage.");

  // -------------------------------------------------------------
  // Test 3: Voice Command Matching & Vernacular Gating
  // -------------------------------------------------------------
  console.log("  3. Testing voice command routing and language flag gating...");

  // English navigation matching
  const mandiCmd = matchVoiceCommand("show mandi prices today", "en");
  assert.ok(mandiCmd, "Must match English mandi command");
  assert.equal(mandiCmd?.path, "/mandi-prices");

  const weatherCmd = matchVoiceCommand("check the weather forecast", "en");
  assert.ok(weatherCmd, "Must match English weather command");
  assert.equal(weatherCmd?.path, "/farmer/weather");

  const cartCmd = matchVoiceCommand("open my shopping cart", "en");
  assert.ok(cartCmd, "Must match English cart command");
  assert.equal(cartCmd?.path, "/cart");

  const cropDocCmd = matchVoiceCommand("check plant disease with crop doctor", "en");
  assert.ok(cropDocCmd, "Must match crop doctor command");
  assert.equal(cropDocCmd?.path, "/crop-doctor");

  const loginCmd = matchVoiceCommand("open login page please", "en");
  assert.ok(loginCmd, "Must match English login command");
  assert.equal(loginCmd?.path, "/login");

  const signupCmd = matchVoiceCommand("go to register and sign up", "en");
  assert.ok(signupCmd, "Must match English signup command");
  assert.equal(signupCmd?.path, "/signup");

  // Language switch command
  const langCmd = matchVoiceCommand("switch to hindi language", "en");
  assert.ok(langCmd, "Must match language switch command");
  assert.equal(langCmd?.action, "language");
  assert.equal(langCmd?.targetLang, "hi");

  // Verify Hindi/Marathi gating when VOICE_COMMANDS_HI_MR_ENABLED is not 'true'
  delete process.env.VOICE_COMMANDS_HI_MR_ENABLED;
  const configsDefault = getVoiceLocaleConfig();
  assert.equal(configsDefault.en.enabled, true, "English must be enabled by default");
  assert.equal(configsDefault.hi.enabled, false, "Hindi must be disabled by default pending native review");
  assert.equal(configsDefault.mr.enabled, false, "Marathi must be disabled by default pending native review");

  // When flag is enabled
  process.env.VOICE_COMMANDS_HI_MR_ENABLED = "true";
  const configsEnabled = getVoiceLocaleConfig();
  assert.equal(configsEnabled.hi.enabled, true, "Hindi enabled when flag is set");
  assert.equal(configsEnabled.mr.enabled, true, "Marathi enabled when flag is set");

  const hiMandiCmd = matchVoiceCommand("मंडी भाव दिखाओ", "hi");
  assert.ok(hiMandiCmd, "Must match Hindi mandi command when enabled");
  assert.equal(hiMandiCmd?.path, "/mandi-prices");

  const mrWeatherCmd = matchVoiceCommand("हवामान अंदाज दाखवा", "mr");
  assert.ok(mrWeatherCmd, "Must match Marathi weather command when enabled");
  assert.equal(mrWeatherCmd?.path, "/farmer/weather");

  // Clean up flag
  delete process.env.VOICE_COMMANDS_HI_MR_ENABLED;
  console.log("     ✓ Voice command routing and feature-flag gating verified.");

  // -------------------------------------------------------------
  // Test 4: Guest Role Barrier (Must require login for farmer/buyer tools)
  // -------------------------------------------------------------
  console.log("  4. Testing guest access barrier on protected farmer/buyer features...");

  // Guest attempts to open cart -> must be redirected to login with "login first" message
  const guestCartResp = await AIService.chatAssistant("open my shopping cart", [], "guest", "guest", "en");
  assert.equal(guestCartResp.action?.path, "/login", "Guest accessing cart must be directed to /login");
  assert.ok(
    guestCartResp.message.toLowerCase().includes("login") || guestCartResp.message.toLowerCase().includes("log in"),
    "Message must prompt guest to log in first"
  );

  // Guest attempts to open weather -> must be redirected to login
  const guestWeatherResp = await AIService.chatAssistant("check weather forecast", [], "guest", "guest", "en");
  assert.equal(guestWeatherResp.action?.path, "/login", "Guest accessing weather must be directed to /login");

  // Guest attempts to open mandi prices -> must be redirected to login
  const guestMandiResp = await AIService.chatAssistant("show mandi prices", [], "guest", "guest", "en");
  assert.equal(guestMandiResp.action?.path, "/login", "Guest accessing mandi prices must be directed to /login");

  // Guest asks for public features (login, signup, products) -> must be allowed without obstruction
  const guestLoginResp = await AIService.chatAssistant("open login page", [], "guest", "guest", "en");
  assert.equal(guestLoginResp.action?.path, "/login");
  assert.ok(!guestLoginResp.message.includes("reserved for registered users"), "Direct login navigation must succeed cleanly");

  const guestMarketResp = await AIService.chatAssistant("browse vegetables", [], "guest", "guest", "en");
  assert.equal(guestMarketResp.action?.path, "/products", "Public produce browsing must be accessible to guests");

  // Authenticated farmer attempts to open weather -> must succeed without being asked to log in
  const farmerWeatherResp = await AIService.chatAssistant("check weather forecast", [], userA._id.toString(), "farmer", "en");
  assert.equal(farmerWeatherResp.action?.path, "/farmer/weather", "Authenticated farmer must access weather directly");
  assert.ok(farmerWeatherResp.message.includes("Navigating to Weather Advisory"));

  console.log("     ✓ Guest access barrier verified: all protected features require login first.");

  // -------------------------------------------------------------
  // Test 5: Comprehensive Role-Based Feature Access
  // -------------------------------------------------------------
  console.log("  5. Testing full feature access for logged-in Farmer and Buyer...");

  // Farmer commands
  const fDash = await AIService.chatAssistant("open dashboard", [], userA._id.toString(), "farmer", "en");
  assert.equal(fDash.action?.path, "/farmer/dashboard", "Farmer dashboard routing");

  const fAddListing = await AIService.chatAssistant("sell crop now", [], userA._id.toString(), "farmer", "en");
  assert.equal(fAddListing.action?.path, "/farmer/listings/new", "Farmer add listing routing");

  const fListings = await AIService.chatAssistant("view my listings", [], userA._id.toString(), "farmer", "en");
  assert.equal(fListings.action?.path, "/farmer/listings", "Farmer my listings routing");

  const fOrders = await AIService.chatAssistant("view orders list", [], userA._id.toString(), "farmer", "en");
  assert.equal(fOrders.action?.path, "/farmer/orders", "Farmer orders routing");

  const fOffers = await AIService.chatAssistant("show buyer proposals", [], userA._id.toString(), "farmer", "en");
  assert.equal(fOffers.action?.path, "/farmer/offers", "Farmer offers routing");

  const fBulk = await AIService.chatAssistant("show bulk demands", [], userA._id.toString(), "farmer", "en");
  assert.equal(fBulk.action?.path, "/farmer/bulk-demands", "Farmer bulk demands routing");

  // Buyer commands
  const bDash = await AIService.chatAssistant("open dashboard", [], userB._id.toString(), "buyer", "en");
  assert.equal(bDash.action?.path, "/buyer/dashboard", "Buyer dashboard routing");

  const bCart = await AIService.chatAssistant("open shopping cart", [], userB._id.toString(), "buyer", "en");
  assert.equal(bCart.action?.path, "/cart", "Buyer cart routing");

  const bCheckout = await AIService.chatAssistant("proceed to checkout", [], userB._id.toString(), "buyer", "en");
  assert.equal(bCheckout.action?.path, "/checkout", "Buyer checkout routing");

  const bOffers = await AIService.chatAssistant("show sent offers", [], userB._id.toString(), "buyer", "en");
  assert.equal(bOffers.action?.path, "/buyer/offers", "Buyer offers routing");

  // Buyer trying to sell crops -> guided to marketplace
  const bSell = await AIService.chatAssistant("sell my crops", [], userB._id.toString(), "buyer", "en");
  assert.equal(bSell.action?.path, "/products", "Buyer selling crops must be guided to marketplace");
  assert.ok(bSell.message.includes("reserved for farmers"));

  console.log("     ✓ Full feature access verified for both Farmer and Buyer roles.");

  console.log("✅ All Phase 12 AI & Voice Assistant Tests Passed!\n");
}
