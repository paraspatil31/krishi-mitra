# Feature tickets
Atomic, buildable tickets derived from the PRD. Each ticket should be small enough to complete and test in isolation. Grouped by phase — build in order.

> **v1.1 note**: Phases 0–7 are unchanged from the original plan. Phases 8–11 below are new, added to cover the expanded market-intelligence scope (mandi prices, AI forecasting, buyer verification, offers, quality grading, storage, reviews, multilingual, notifications, market finder). Build phases 0–7 first — the new phases build on top of the core marketplace loop, not instead of it.

---

## Phase 0 — Project setup
- **T0.1** — Scaffold Express backend with health-check endpoint. *(Done)*
- **T0.2** — Scaffold React (Vite) frontend calling the health-check endpoint. *(Done)*
- **T0.3** — Deploy backend to Render/Railway and frontend to Vercel with working environment variables.
- **T0.4** — Set up MongoDB Atlas cluster (dev + prod databases) and confirm connection from local backend.

## Phase 1 — Auth & roles
- **T1.1** — Create `User` Mongoose model with `role` enum (`farmer`, `buyer`, `admin`).
  *Acceptance*: model validates required fields, rejects invalid role values.
- **T1.2** — Build `/api/auth/signup` route with bcrypt password hashing.
  *Acceptance*: duplicate phone/email is rejected; password is never returned in the response.
- **T1.3** — Build `/api/auth/login` route issuing JWT access + refresh tokens.
  *Acceptance*: wrong password returns 401 with no user-existence leak (same error for "no user" and "wrong password").
- **T1.4** — Build JWT verification middleware (`authenticate`).
  *Acceptance*: missing/invalid/expired token returns 401 with a clear error.
- **T1.5** — Build role-check middleware (`requireRole('farmer')`).
  *Acceptance*: wrong role returns 403; correct role passes through to the route handler.
- **T1.6** — Add rate limiting to `/api/auth/login` and OTP endpoints.
  *Acceptance*: 6th attempt within 15 minutes from the same IP/phone is rejected.
- **T1.7** — Build frontend signup/login forms wired to the above routes, storing the access token in memory (not localStorage) and the refresh token via `httpOnly` cookie.
- **T1.8** — Postman/automated test suite covering signup, login, protected-route access with and without valid tokens, and role rejection.

## Phase 2 — Farmer listing management
- **T2.1** — Create `Listing` Mongoose model with `2dsphere` index on `location`.
- **T2.2** — Build `/api/listings` POST route (farmer-only), validating price/quantity server-side.
- **T2.3** — Build `/api/listings/mine` GET route returning the logged-in farmer's own listings.
- **T2.4** — Build `/api/listings/:id` PUT route (farmer-only, own listings only).
- **T2.5** — Build soft-delete on `/api/listings/:id` DELETE (`isActive: false`, not a hard delete).
- **T2.6** — Integrate Cloudinary/S3 image upload with MIME-type and size validation (max 5MB).
- **T2.7** — Build frontend "create listing" form with photo upload and draft-save capability.
- **T2.8** — Build frontend "my listings" dashboard view for farmers.

## Phase 3 — Buyer browse, search & orders
- **T3.1** — Build `/api/listings` GET route with filters (crop, price range, location radius via `$geoNear`).
- **T3.2** — Build frontend browse/search page with filter controls.
- **T3.3** — Build `/api/listings/:id` GET route for listing detail.
- **T3.4** — Create `Order` Mongoose model with a status enum and explicit allowed-transition rules.
- **T3.5** — Build `/api/orders` POST route wrapped in a MongoDB transaction: recheck stock, decrement listing quantity, create order record atomically.
  *Acceptance*: two concurrent orders for the last unit — exactly one succeeds, one gets a clear "no longer available" error. *(Done — hardened 2026-09-03, see `PROGRESS.md`.)*
- **T3.6** — Build `/api/orders/:id/status` PATCH route enforcing the status state machine (e.g. can't go `pending` → `delivered` directly).
- **T3.7** — Build `/api/orders/mine` GET route (returns orders where the user is buyer or farmer, scoped correctly).
- **T3.8** — Build frontend order placement flow and order tracking page with `OrderStatusBadge`.

## Phase 4 — Payments
- **T4.1** — Integrate Razorpay SDK; build `/api/payments/initiate` route.
- **T4.2** — Build `/api/payments/webhook` route with signature verification and idempotency check (dedupe by gateway event ID).
- **T4.3** — Create `Payment` Mongoose model logging every state transition with an append-only event log.
- **T4.4** — Implement escrow hold-on-capture, release-on-delivery-confirmation logic.
- **T4.5** — Build admin-only manual escrow release/refund override route, for disputes.
- **T4.6** — Build frontend checkout flow embedding Razorpay's hosted UI — no raw card/UPI handling in your own code.
- **T4.7** — End-to-end sandbox test: place order → pay → confirm delivery → verify farmer payout record created correctly.

## Phase 5 — Weather advisory
- **T5.1** — Build a weather service module wrapping the IMD/OpenWeatherMap API call, with caching per district.
- **T5.2** — Build a scheduled job (node-cron) that checks each active district's forecast against alert thresholds.
- **T5.3** — Create `WeatherAlert` model and `/api/weather/alerts` GET route scoped to the logged-in farmer's district.
- **T5.4** — Build push notification or SMS delivery for triggered alerts.
- **T5.5** — Build frontend `WeatherAlertBanner` on the farmer dashboard.
- **T5.6** — Add graceful failure handling so a weather API outage never affects unrelated requests.

## Phase 6 — Blockchain provenance ledger
- **T6.1** — Stand up a Hyperledger Fabric test network (or Polygon testnet) and write a minimal chaincode/contract for harvest-date + farmer-ID + quality-tag entries.
- **T6.2** — Build a `ledger.service.ts` backend module that writes to the chain and returns a transaction hash.
- **T6.3** — Create `LedgerEntry` model storing the tx hash linked to a listing.
- **T6.4** — Trigger an async, best-effort ledger write on listing creation (must not block listing creation if the chain write fails).
- **T6.5** — Build `/api/ledger/:listingId` GET route for provenance lookup.
- **T6.6** — Build frontend `ProvenanceBadge` + QR code generation, and the QR-landing verification page.

## Phase 7 — Testing, hardening & launch
- **T7.1** — Write automated tests for the order-creation transaction (concurrent order race condition).
- **T7.2** — Write automated tests for payment webhook idempotency (duplicate event delivery).
- **T7.3** — Add rate limiting to all public-facing endpoints, not just auth.
- **T7.4** — Set up Sentry (or equivalent) error monitoring on both backend and frontend.
- **T7.5** — Load-test the order + payment flow under concurrent load.
- **T7.6** — Manual test pass on a low-end Android device over throttled 3G.
- **T7.7** — Legal/compliance review of data collection and payment handling before go-live.
- **T7.8** — Onboard first cohort of real farmers in a single target district; monitor closely for the first two weeks.

---

## Phase 8 — Market intelligence: mandi prices & AI forecasting *(new in v1.1)*
- **T8.1** — Build a `MandiPrice` Mongoose model and an ingestion job pulling from a market-price API/dataset (e.g. Agmarknet), cached per crop/market/day.
  *Acceptance*: each record carries `priceDate`, `ingestedAt`, and `source` for auditability.
- **T8.2** — Build `/api/mandi-prices` GET route with crop/market/date-range filters.
- **T8.3** — Stand up a separate Python (FastAPI/Flask) AI service (`ai-service/`) with a basic price-trend prediction model (Pandas/Scikit-learn) trained on historical mandi price data.
- **T8.4** — Build `/api/predictions` route in the Node backend that calls the Python service and returns results.
  *Acceptance*: if the AI service is down/slow/malformed, the route returns a clear "unavailable" response within a short timeout — it never hangs or crashes the request.
- **T8.5** — Build frontend mandi price dashboard: `PriceTrendChart` showing historical prices plus a predicted trend, clearly labeled as an estimate.

## Phase 9 — Buyer verification & offers *(new in v1.1)*
- **T9.1** — Add `isVerifiedBuyer` field to `User`, settable only via an admin-only route.
  *Acceptance*: no non-admin route can set this field, even indirectly via a generic profile-update endpoint.
- **T9.2** — Build `Offer` Mongoose model (`listingId`, `buyerId`, `farmerId`, `offerPrice`, `offerQuantity`, `status`, `expiresAt`).
- **T9.3** — Build `/api/offers` POST route (buyer-only) with server-side validation on price/quantity.
- **T9.4** — Build `/api/offers/:id/respond` PATCH route (farmer/FPO-only, own listings only) for accept/reject.
- **T9.5** — Accepting an offer reuses the atomic transaction pattern from T3.5: recheck stock, decrement, create an order (with `offerId` set) from the offer, mark the offer `accepted`.
  *Acceptance*: if stock is no longer sufficient at accept-time, the accept fails with a clear error — the same race-condition protection as direct orders, not a separate, weaker code path.
- **T9.6** — Build `/api/offers/mine` GET route scoped by role.
- **T9.7** — Build frontend `OfferCard`, offer submission form, and offers inbox pages (farmer/FPO + buyer views).
- **T9.8** — Build an admin buyer-verification review page/route.

## Phase 10 — Quality grading, storage & reviews *(new in v1.1)*
- **T10.1** — Add `qualityGrade` field to `Listing`, settable by the farmer/FPO at creation/edit.
- **T10.2** — Build a `Review` Mongoose model (`reviewerId`, `targetUserId`, `orderId`, `rating`, `comment`).
  *Acceptance*: review submission is rejected server-side unless the linked order's status is `delivered`.
- **T10.3** — Build `/api/reviews` POST and `/api/reviews/user/:userId` GET routes.
- **T10.4** — Build a `StorageFacility` model (admin-curated, not self-service) and `/api/storage` GET route with proximity filtering.
- **T10.5** — Build frontend `QualityGradeBadge`, `RatingStars`/review submission UI, and the storage facility directory page.

## Phase 11 — Multilingual, notifications & market finder *(new in v1.1)*
- **T11.1** — Integrate i18next/react-i18next; extract all UI strings into `locales/en.json`, `locales/hi.json`, `locales/mr.json`.
- **T11.2** — Add the `--font-devanagari` fallback and verify Hindi/Marathi rendering doesn't break layout or tap-target sizing.
- **T11.3** — Build `LanguageSwitcher` component; add `preferredLanguage` to `User` and persist the choice.
- **T11.4** — Integrate Firebase Cloud Messaging (with email fallback) for price/offer notifications, decoupled from the request/response cycle like weather alerts.
- **T11.5** — Integrate Maps (Google Maps API or OpenStreetMap) for `/api/markets/nearby` and the `MarketFinderMap` frontend component.
  *Acceptance*: the Maps API key is domain/referrer-restricted, and the frontend key is separate from any backend key.
- **T11.6** — Build the FPO role end to end: FPO dashboard aggregating member farmers' lots and offers, scoped so an FPO only ever sees its own members' data.

## Phase 12 — AI crop diagnosis & Krishi Mitra voice assistant *(new in v1.2)*
- **T12.1** — Build `backend/src/services/ai.service.ts` with strict two-mode (`ai_model` / `basic_fallback`) response shape.
  *Acceptance*: when `GEMINI_API_KEY` is absent, basic fallback mode *never* returns confidence %, numeric quality grades, freshness scores, or chemical remedies/dosages.
- **T12.2** — Build `/api/ai/diagnose` and `/api/ai/chat` routes & controller (`ai.controller.ts`, `ai.routes.ts`) behind `aiLimiter`.
  *Acceptance*: chat assistant strictly enforces server-side scoping to `req.user.id` and cannot leak or query another user's orders or data.
- **T12.3** — Build `voiceCommands.locales.ts` with isolated keyword-to-action definitions. English enabled by default; Hindi and Marathi gated behind `VOICE_COMMANDS_HI_MR_ENABLED` pending native-speaker verification pass.
- **T12.4** — Build frontend `CropDoctor.tsx` (`/crop-doctor`) with live camera capture, radar scanning animation, and two visually distinct result states (vibrant AI diagnosis vs. muted basic check notice). Connect "List for Sale With Grade" to `ListingForm.tsx`.
- **T12.5** — Build frontend `VoiceAssistantModal.tsx` with floating audio orb, Web Speech API speech recognition and speech synthesis, autonomous site navigation, and a visible text-input fallback for unsupported browsers.
- **T12.6** — Document diagnostic-photo zero-retention ephemeral processing policy in `docs/03-security-and-access.md`.
- **T12.7** — Write automated test suite `backend/src/tests/ai.test.ts` verifying fallback invariants, data isolation, and voice command routing, wired into master runner `run-all.ts`.