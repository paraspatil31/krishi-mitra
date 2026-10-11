# Security & access document
**Project**: Farmer-to-consumer marketplace

---

## 1. Authentication *(original, unchanged)*

- Passwords hashed with bcrypt (cost factor 10+). Plaintext passwords are never logged, stored, or transmitted outside the initial HTTPS request.
- Login supports phone + OTP as the primary method (higher trust for rural users) and email + password as a secondary method.
- On successful login, issue a short-lived JWT access token (~30 min) and a longer-lived refresh token stored as an `httpOnly` cookie.
- Refresh tokens are single-use and rotated on every refresh — if a refresh token is reused after rotation, treat it as a compromise signal and invalidate the whole session family.
- Rate-limit `/api/auth/login` and `/api/auth/otp` specifically (e.g. 5 attempts per 15 minutes per phone/IP) to blunt brute-force and OTP-spam attacks.

## 2. Roles

*Original (v1.0):*

| Role | Description |
|---|---|
| `farmer` | Can create/edit/delete their own listings, view and confirm their own orders, receive payments and weather alerts. |
| `buyer` | Can browse listings, place orders, make payments, confirm delivery, rate farmers. |
| `admin` | Internal role for dispute resolution, escrow release overrides, and platform moderation. Not self-assignable — seeded manually. |

*New in v1.1:*

| Role | Description |
|---|---|
| `fpo` | Represents a Farmer Producer Organization with multiple member farmers. Can create/manage crop lots and respond to offers on behalf of its members. Scoped so it can only see and act on its own members' data — never another FPO's or an unaffiliated individual farmer's data. Functionally has the same permissions as `farmer` for listings/orders/offers, applied at the organization level rather than the individual level. |

**New trust flag, not a role**: `isVerifiedBuyer` (boolean on `buyer` accounts). Not a separate role — a buyer with `isVerifiedBuyer: true` still has all the same `buyer` permissions, just with a visible trust badge. This flag is settable only via an admin-only route (see rule below); a buyer can never set this on their own profile.

## 3. Permission matrix

*Original (v1.0):*

| Action | Farmer | Buyer | Admin |
|---|---|---|---|
| Create listing | Own only | ✗ | ✗ |
| Edit/delete listing | Own only | ✗ | Any (moderation) |
| Place order | ✗ | ✓ | ✗ |
| Confirm order (mark confirmed) | Own listings only | ✗ | ✓ |
| Mark order delivered | ✗ | ✓ (confirms receipt) | ✓ (override, disputes only) |
| Cancel order | Own, before confirmation | Own, before confirmation | Any |
| Initiate payment | ✗ | ✓ | ✗ |
| Release escrow | System-triggered on delivery confirmation | ✗ | ✓ (manual override for disputes) |
| View any user's PII | ✗ | ✗ | ✓ (audited access only) |

*New in v1.1 — additional rows (FPO follows the same rules as Farmer, scoped to its own members):*

| Action | Farmer / FPO | Buyer | Admin |
|---|---|---|---|
| Submit an offer | ✗ | ✓ | ✗ |
| Accept/reject an offer | Own listings only | ✗ | ✓ (dispute override only) |
| Set `isVerifiedBuyer` on a buyer account | ✗ | ✗ (cannot self-verify) | ✓ (only route that may set this flag) |
| Post a review on a buyer | Own completed orders only, and only after `delivered` | ✗ | ✓ (moderation) |
| Create/edit a storage facility entry | ✗ | ✗ | ✓ (admin-curated, no self-service in v1.1) |
| View mandi prices / AI predictions | ✓ (read-only) | ✓ (read-only) | ✓ |

**Enforcement rule** *(unchanged)*: every permission above must be checked server-side in Express middleware/controllers — never rely on the frontend hiding a button as the actual access control. The JWT's `role` and `sub` (user ID) claims are the source of truth for every authorization check.

## 4. Input validation rules *(implemented in `backend/src/utils/validation.ts`)*

- All request bodies validated server-side before touching the database — never trust client-side validation alone.
- **Phone numbers**: Strict Indian canonical format `^[6-9]\d{9}$` (10 digits starting with 6–9), validated before triggering OTP sends to prevent carrier spam and cost abuse.
- **PIN codes**: 6-digit Indian postal codes `^[1-9][0-9]{5}$` enforced on checkout and delivery address payloads.
- **Harvest dates**: Must be formatted valid date strings, cannot be in the future, and cannot be older than 365 days past.
- **Crop units**: Strict enum checks (`kg`, `quintal`, `dozen`, `piece`, `ton`, `crate`, `bunch`, `litre`).
- **String fields**: Automatic HTML tag stripping (`/<[^>]*>?/gm`) and whitespace trimming to prevent XSS.
- **Numeric fields** (`price`, `quantity`, and new in v1.1: `offerPrice`, `offerQuantity`, `rating`): must be positive, finite numbers within sane bounds (`> 0`); reject negative or zero values.
- **Order state machine**: Strict server-side validation on status transitions (`pending` → `confirmed` → `processing` → `shipped` → `delivered`).
- **Delivery address**: Full address validation requiring name, 10-digit phone, street, district, state, and 6-digit PIN code.
- **File uploads**: validate MIME type and size (cap at 5MB) before accepting; never trust the file extension alone.

## 5. Error handling standards *(original, unchanged)*

- Use a centralized error handler (see architecture doc) so every error response has a consistent shape: `{ error: "message" }`.
- Return generic messages for 500-level errors in production (`"Something went wrong on our end"`) — never leak stack traces or internal details to the client.
- Return specific, actionable messages for 400-level errors (`"Quantity must be greater than zero"`) so users and the frontend can react correctly.
- Log full error details (stack trace, request context) server-side via Sentry or equivalent — the client-facing message and the logged detail are intentionally different.

## 6. Edge cases to handle explicitly

*Original (v1.0):*

| Edge case | Handling |
|---|---|
| Two buyers order the last unit of a listing simultaneously | Use a MongoDB transaction with a quantity recheck at write time; the second request fails with a clear "no longer available" error rather than allowing overselling. |
| Payment webhook delivered twice by the gateway | Store the gateway's event ID and check for duplicates before processing — make webhook handling idempotent. |
| Buyer's JWT expires mid-checkout | Frontend catches the 401, silently attempts a refresh-token exchange, and retries the request once before prompting re-login. |
| Farmer tries to edit a listing that already has a confirmed order against it | Allow price/photo edits but block quantity reduction below what's already been ordered. |
| Buyer marks an order "delivered" that was never actually shipped | Require farmer to first mark `out_for_delivery` before a buyer can mark `delivered` — status transitions are validated as an explicit state machine, not free-form. |
| Weather API is down or times out | Background job logs the failure and retries on the next scheduled run; it must never block or crash unrelated request handling. |
| A user attempts to access another user's order or payment record by guessing an ID | Every fetch-by-ID route checks that `req.user.id` matches the resource's `buyerId`/`farmerId` (or the user is an admin) before returning data — never rely on obscurity of the ID. |
| Refund requested after escrow has already been released | Route to manual admin review — no automatic reversal once funds have left escrow. |
| Blockchain ledger write fails after the listing was already created | Treat ledger write as best-effort/async; the listing remains valid without a provenance badge until the ledger entry succeeds, rather than blocking listing creation on ledger availability. |

*New in v1.1:*

| Edge case | Handling |
|---|---|
| A buyer submits an offer on a listing that sells out (via direct order) before the farmer responds | Recheck stock at accept-time, not just at submit-time — the same principle as the order-creation transaction. If stock is insufficient when the farmer accepts, the accept fails with a clear error and the offer is marked unfulfillable rather than silently succeeding. |
| A farmer accepts an offer | Must go through the same atomic stock-check-and-decrement transaction pattern used for direct order creation (see `docs/06-build-guide-dos-and-donts.md` phase 9), converting the accepted offer into an order — not a separate, less-safe code path. |
| An offer sits unanswered past its `expiresAt` | A scheduled job (or a check-on-read) marks it `expired`; an expired offer cannot be accepted even if a farmer tries. |
| The AI price prediction service is down, slow, or returns malformed data | Treat as best-effort/async, exactly like the weather and blockchain services — the mandi price page shows "prediction unavailable" rather than blocking or erroring the whole page. |
| A buyer or farmer submits a review before the linked order is actually delivered | Reject the review submission server-side unless `order.status === 'delivered'` — never trust a client-side check alone here. |
| Mandi price data is delayed, stale, or missing for a given crop/date | Every price record carries `priceDate` and `ingestedAt`; the frontend must display "last updated" and never present stale data as if it were current. |
| A buyer's verification request is submitted but never reviewed | `isVerifiedBuyer` defaults to `false` and stays `false` indefinitely until an admin acts — an unreviewed request must never silently default to verified. |
| An FPO user attempts to view or act on another FPO's or an unaffiliated farmer's listings/offers | Every FPO-scoped query filters by the FPO's own member-farmer IDs server-side — an FPO's dashboard must never be a thin client trusting a farmer ID passed in the request. |

## 7. Data privacy notes *(original, unchanged; extended)*

- Collect only what's necessary: name, phone, location/district. Avoid collecting Aadhaar or other sensitive ID data unless a specific compliance requirement (e.g. government marketplace integration) demands it — and if so, encrypt at rest and restrict access to admin role only, with access logging.
- Location data is stored at the precision needed for proximity search and district-level weather targeting — avoid storing more precise tracking data than the feature requires.
- Any data shared with third parties (payment gateway, weather API, SMS/OTP provider, and new in v1.1: mandi price API, Maps API, FCM) should be limited to the minimum fields those services require to function.
- **New in v1.1**: buyer verification documents (if any are collected for admin review) must be stored with restricted admin-only access and a defined retention/deletion policy — don't accumulate identity documents indefinitely without a reason.
- **New in Phase 12 (AI Crop Diagnosis & Voice Assistant)**: Diagnostic crop images uploaded for disease detection or produce quality inspection are processed strictly in-memory for the duration of the HTTP request and are discarded immediately upon response delivery. Images are never written to disk or persistently stored on KrishiBazaar application servers. Upstream vision model inference calls (via Google Gemini) adhere to standard zero-data-retention enterprise terms. All conversational voice chat requests are strictly scoped server-side to the authenticated `req.user.id` and never cross-pollinate user order data.