# Farmer marketplace — build guide (do's and don'ts by phase)

> **v1.1 note**: Phases 0–7 below are unchanged from the original guide. Phases 8–11 are new, covering the expanded market-intelligence scope.

## The general rule for what to vibe-code vs hand-code

Before the phase breakdown, one principle that applies everywhere in this project:

- **Vibe-code freely**: UI components, CRUD boilerplate, form layouts, styling, static content, read-only display logic.
- **Hand-code carefully, review every line**: anything touching money, authentication, authorization, or data that must stay consistent (inventory counts, order status transitions). If an AI-generated snippet touches a payment, a password, or a database transaction, read it line by line before running it — don't just paste and go.

Money bugs and security bugs are invisible until they cost you. UI bugs are visible immediately. Bias your review effort accordingly.

---

## Phase 0 — Project setup & scaffolding

**Do**
- Set up `.env` files immediately and add `.env` to `.gitignore` before your first commit — not after.
- Use a consistent folder structure from day one: `routes/`, `controllers/`, `models/`, `middleware/`, `config/`. Retrofitting structure later is painful.
- Set up ESLint + Prettier now. It's a 10-minute task today, a painful refactor in month three.
- Deploy a "hello world" version to Render/Railway and Vercel on day one, even before real features exist. Having a live URL from the start makes every later deploy lower-stakes.
- Set up separate MongoDB databases for dev and production immediately (e.g. MongoDB Atlas free tier per environment).

**Don't**
- Don't commit any `.env`, API key, or database connection string to Git — ever, even in a private repo.
- Don't skip setting up CORS properly "for now." Misconfigured CORS (`origin: '*'` in production) is a real vulnerability you'll forget to fix later.
- Don't start writing feature code before the health-check endpoint and deployment pipeline both work. Fix your foundation first.

**Vibe-code safe**: folder scaffolding, ESLint config, basic Express boilerplate.
**Hand-check**: `.env` handling, CORS config, deployment environment variables.

---

## Phase 1 — Auth & user roles

**Do**
- Hash passwords with bcrypt (or argon2) — never store plaintext, ever, even temporarily during testing.
- Use short-lived JWT access tokens (15-30 min) plus a refresh token flow, rather than one long-lived token.
- Validate and sanitize every input on the auth routes (email format, password strength) before it touches the database.
- Rate-limit login and OTP endpoints specifically — these are the first thing attackers probe.
- Store the user's role (`farmer` / `buyer`) in the JWT payload and re-verify it server-side on every protected route, not just on the frontend.

**Don't**
- Don't trust the frontend to enforce roles. A farmer-only route must check the role in Express middleware, not just hide the button in React.
- Don't roll your own crypto or JWT signing logic — use established libraries (`jsonwebtoken`, `bcrypt`) exactly as documented.
- Don't skip email/phone verification "for now" — unverified accounts are how fraud starts on a payments-involved platform.
- Don't store JWTs in `localStorage` if you can avoid it — prefer `httpOnly` cookies to reduce XSS token theft risk.

**Vibe-code safe**: login/signup form UI, OTP input screens.
**Hand-code carefully**: password hashing, JWT generation/verification, role-check middleware — read every line an AI writes here.

---

## Phase 2 — Farmer listing management (CRUD)

**Do**
- Validate uploaded images (file type, size limit) before accepting them — cap at something reasonable like 5MB per image.
- Use Cloudinary or S3 for image storage; store only the URL in MongoDB.
- Add a `2dsphere` index on the listing's location field from the start — retrofitting geo-indexes on a live collection is annoying.
- Soft-delete listings (`isActive: false`) rather than hard-deleting, so order history doesn't break when a farmer removes a listing.
- Let farmers save drafts — a listing form that requires everything in one go will lose you rural users with patchy connectivity.

**Don't**
- Don't let farmers set arbitrary/negative prices or quantities — validate ranges server-side even if you validate them client-side too.
- Don't hard-delete a listing that has existing orders attached to it — you'll orphan order records.
- Don't over-engineer the listing schema early with every possible crop attribute. Start with common fields (name, quantity, price, photos, harvest date, location) and add crop-specific fields later once you see real usage patterns.

**Vibe-code safe**: listing form UI, image upload component, listing card/grid display.
**Hand-check**: server-side validation rules, geo-index setup, soft-delete logic.

---

## Phase 3 — Buyer browse, search & orders

**Do**
- Use MongoDB transactions (`session.withTransaction()`) for order creation — the listing quantity decrement and order record creation must succeed or fail together.
- Add an explicit order status enum (`pending`, `confirmed`, `delivered`, `cancelled`) and only allow valid transitions between them (e.g. you can't go from `delivered` back to `pending`).
- Recheck stock/quantity availability server-side at the moment of order placement, not just when the buyer first loaded the listing — someone else may have bought it in between.
- Index frequently filtered fields (location, crop category, price) for search performance as your listing count grows.

**Don't**
- Don't trust the price or quantity sent from the frontend when creating an order — always re-fetch the current listing price/quantity server-side and use that, never the client's copy.
- Don't skip the transaction step "since it's just an MVP." This is the single most common source of data corruption bugs in marketplace apps (double-selling stock, orphaned orders).
- Don't allow unlimited order status changes from either side without server-side rules — e.g. a buyer shouldn't be able to mark their own order as "delivered."

**Vibe-code safe**: search/filter UI, order history screens, order status badges.
**Hand-code carefully**: the transaction block for order creation, stock recheck logic, status transition rules — this is the highest-risk code in the whole app so far.

---

## Phase 4 — Payments integration

**Do**
- Use Razorpay's or PhonePe's official SDK and webhook verification exactly as documented — verify webhook signatures server-side before trusting any payment event.
- Log every payment state change (initiated, captured, held, released, refunded, failed) as its own record — you'll need this audit trail when something goes wrong.
- Test extensively in sandbox mode with test cards/UPI IDs before enabling live payments.
- Build the escrow release as a manual admin action initially (even a simple internal dashboard button), rather than fully automating "release on delivery confirmation" — automate that only once you trust the delivery-confirmation flow itself.
- Handle payment failures and timeouts gracefully — show the buyer a clear retry path, don't leave orders in a stuck "processing" state.

**Don't**
- Don't handle raw card numbers or UPI credentials yourself, ever — always redirect to the payment gateway's hosted checkout/SDK flow. Handling raw payment data yourself brings PCI-DSS compliance obligations you don't want.
- Don't trust a client-side "payment successful" callback alone — always confirm the payment server-side via webhook or a status API call before marking an order as paid.
- Don't release money to a farmer automatically the instant a buyer clicks "delivered" without at least a short dispute window in early versions.
- Don't skip idempotency handling on webhook endpoints — payment gateways can send the same webhook twice, and double-processing a payment is a real bug you will hit.

**Vibe-code safe**: checkout UI, payment status screens, "your orders" payment history view.
**Hand-code carefully — no exceptions**: webhook signature verification, payment state transitions, escrow release logic. This is money. Review every line yourself, don't just trust generated code here.

---

## Phase 5 — Weather advisory service

**Do**
- Run forecast fetching as a background scheduled job (node-cron or a queue like BullMQ), decoupled from user-facing request handling.
- Cache weather data per district/region rather than calling the API per-farmer — most farmers in the same district share a forecast.
- Set sensible alert thresholds (e.g. >50mm rain in 24h, temp below a frost threshold) and let farmers adjust sensitivity if they want fewer/more alerts.
- Fail gracefully — if the weather API is down, don't let it break other parts of the app; log the failure and retry later.

**Don't**
- Don't call the weather API synchronously inside a user-facing request — it'll slow down unrelated parts of your app if the external API is slow.
- Don't over-promise accuracy — frame alerts as advisory, not guarantees, both in your UI copy and internally in how you handle liability.
- Don't spam farmers with alerts — bundle multiple risk factors into one clear notification rather than firing five separate pings.

**Vibe-code safe**: alert display UI, notification preference screens, the district-to-coordinates mapping helper.
**Hand-check**: the scheduled job's retry/failure handling, threshold logic.

---

## Phase 6 — Blockchain provenance ledger

**Do**
- Build this only after the core marketplace has real farmers and orders — it's a differentiator feature, not a dependency for launch.
- Keep the smart contract / chaincode logic minimal: write once (harvest date, farmer ID, quality tag, listing hash), read many. Don't build complex on-chain business logic.
- Store the resulting transaction hash in MongoDB linked to the listing, so your app can display "verified on-chain" without querying the chain on every page load.
- Choose Hyperledger Fabric (permissioned, no gas fees, no wallet needed for farmers) unless you specifically need public verifiability, in which case Polygon is the more reasonable public-chain option over Ethereum mainnet.

**Don't**
- Don't put payments on-chain. Keep this ledger strictly for provenance/traceability data — money stays on UPI/Razorpay as already decided.
- Don't make farmers manage a crypto wallet or pay gas fees themselves — any blockchain interaction should be abstracted away behind your backend, invisible to the farmer.
- Don't treat the on-chain hash as a replacement for your MongoDB data — it's a verification layer on top of your real data, not instead of it.

**Vibe-code safe**: the QR code display, the "verified" badge UI, the provenance detail screen buyers see.
**Hand-code carefully**: the chaincode/smart contract itself, and the service that writes to the ledger — test extensively on a testnet before touching mainnet or a production Fabric network.

---

## Phase 7 — Testing, hardening & launch

**Do**
- Write automated tests first for the money-critical paths: order creation with transactions, payment capture, escrow release.
- Add rate limiting on all public-facing endpoints, not just auth.
- Set up error monitoring (Sentry or similar) before launch, not after your first incident.
- Launch in one district with a small number of real farmers you onboard personally — watch what actually breaks before expanding.
- Get basic legal/compliance sign-off on payment handling and any user data you collect (especially anything Aadhaar-adjacent) before going live.

**Don't**
- Don't skip load-testing the order + payment flow, even at small scale — a stuck transaction under concurrent load is a common failure mode in exactly this kind of app.
- Don't launch pan-India on day one. Regional focus early has worked for comparable apps in this space and gives you a manageable blast radius for bugs.
- Don't treat "it works on my machine" as done — test on a low-end Android device with a throttled 3G connection before calling it launch-ready, since that's your real user's environment.

**Vibe-code safe**: most of your test-writing boilerplate (test setup, fixtures) can be AI-assisted.
**Hand-check**: the actual assertions in your money-path tests — make sure they're testing the real failure modes (concurrent orders on the same stock, duplicate webhook delivery, expired payment sessions), not just the happy path.

---

## Phase 8 — Market intelligence: mandi prices & AI forecasting *(new in v1.1)*

**Do**
- Cache mandi price data rather than hitting the source API/dataset on every page load.
- Timestamp every price record with both `priceDate` (when the price is valid for) and `ingestedAt` (when you pulled it) — display "last updated" to the user.
- Treat the Python AI service as a separate deployable unit with its own health check, not code baked into the Node backend.
- Version your prediction model/training data (even informally, e.g. a date-stamped folder) so you can explain a bad prediction after the fact.

**Don't**
- Don't present AI predictions as guarantees, in UI copy or in how the feature is pitched internally — always "estimated," never "will be."
- Don't call the AI service synchronously in a way that blocks the mandi price page from loading — set a short timeout and degrade to "prediction unavailable."
- Don't scrape a mandi price source without checking its terms of use — prefer an official API or licensed dataset (e.g. Agmarknet) over scraping a website.

**Vibe-code safe**: the price chart/table UI.
**Hand-check**: the AI service's data pipeline, the ingestion job's error handling, and the Node backend's timeout/fallback logic when calling the AI service.

---

## Phase 9 — Buyer verification & offers *(new in v1.1)*

**Do**
- Reuse the exact transaction pattern from phase 3 when accepting an offer — recheck stock at accept-time, decrement atomically, create the order in the same transaction.
- Make `isVerifiedBuyer` settable only through an admin-only route — treat it with the same care as a role field.
- Expire stale offers (via `expiresAt` + a scheduled check or check-on-read) rather than letting them sit open indefinitely.

**Don't**
- Don't let a buyer self-verify, even indirectly through a generic "update my profile" endpoint that happens to accept extra fields.
- Don't let offer acceptance skip the stock recheck just because a check already happened at offer-submission time — stock can change in the gap between submission and acceptance.
- Don't build competitive/auction-style bidding in v1.1 — offers are simple accept/reject, not a race between multiple buyers on the same lot.

**Vibe-code safe**: `OfferCard` UI, offer submission form.
**Hand-code carefully — no exceptions**: the offer-accept-to-order conversion logic. This is the same risk class as the original order-creation transaction (T3.5) — treat it with the same seriousness.

---

## Phase 10 — Quality grading, storage & reviews *(new in v1.1)*

**Do**
- Only allow a review to be submitted when the linked order's status is `delivered` — check this server-side, not just in the frontend form.
- Keep the storage facility directory admin-curated in v1.1, rather than opening it to self-service listings, to avoid spam or fake capacity claims.
- Let quality grading be simple (a small enum like A/B/C) rather than a complex multi-attribute rubric — this is self-reported by the farmer in v1.1, not third-party inspected, and should be presented to buyers with that context.

**Don't**
- Don't let a buyer or farmer submit a review before delivery is confirmed, even if they insist the transaction is "basically done."
- Don't let reviews be silently edited after the fact without some trail — if a farmer made a decision based on a buyer's rating, an untracked retroactive edit undermines the whole trust feature.
- Don't let storage facility data go stale without any signal to the user — even an admin-curated directory needs a visible "as of" date on capacity figures.

**Vibe-code safe**: `QualityGradeBadge`, `RatingStars` display UI, storage facility card layout.
**Hand-check**: the review-eligibility check (delivered-only), and the storage data moderation/update process.

---

## Phase 11 — Multilingual, notifications & market finder *(new in v1.1)*

**Do**
- Extract every UI string into the i18next translation files before translating — don't leave hardcoded English fallback text scattered mid-component.
- Test Devanagari (Hindi/Marathi) rendering on your real target device profile — the same low-end Android + throttled 3G setup called out in phase 7, not just a desktop browser.
- Restrict your Maps API key by domain/referrer, and use separate keys for frontend and backend.

**Don't**
- Don't block core flows (listing a product, placing an order) on notification delivery success — if Firebase Cloud Messaging is slow or down, the underlying action should still succeed.
- Don't ship an unrestricted Maps API key — an open key on a public frontend bundle is a real, exploitable cost/abuse vector.
- Don't assume a translated string is the same length as its English source — test layouts with real Hindi/Marathi copy, not lorem-ipsum-style placeholders.

**Vibe-code safe**: `LanguageSwitcher` UI, translation file scaffolding (the JSON structure itself).
**Hand-check**: Maps/FCM API key restriction and security, and the notification-failure handling path.