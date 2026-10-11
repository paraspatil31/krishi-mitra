# Frontend specification
**Project**: Farmer-to-consumer marketplace

---

## 1. Design direction *(original, unchanged)*

The product's credibility rests on two feelings: **trust** (this produce really is from this farm) and **groundedness** (this is an earthy, agricultural product, not a generic tech SaaS tool). The visual language should read as closer to a well-made cooperative/farmers-market brand than a fintech dashboard — avoid the generic "SaaS card kit" look (identical rounded cards, soft gray shadows, gradient washes).

### Color palette *(unchanged)*

| Token | Hex | Use |
|---|---|---|
| `--color-canopy` | `#26451F` | Primary brand color — deep leaf green. Headers, primary buttons, nav. |
| `--color-harvest` | `#C97A2B` | Accent — warm harvest amber. CTAs, highlights, active states. |
| `--color-soil` | `#4A3826` | Secondary text, footer backgrounds, grounding tone. |
| `--color-husk` | `#F6F1E7` | Page background — warm off-white, not stark white or generic cream. |
| `--color-sky-alert` | `#3B6FA0` | Weather advisory banners and alert badges — distinct from the earthy palette on purpose, so alerts stand out. |
| `--color-danger` | `#A23B2E` | Errors, cancellations, destructive actions. |
| `--color-success` | `#3F7D3A` | Confirmations, delivered status, successful payments. |
| `--color-ink` | `#20241C` | Primary body text. |

This palette is deliberately not the cream-background/terracotta-accent AI-default combination — canopy green and harvest amber are pulled directly from the subject matter (crops, harvest) rather than generic warmth.

### Typography

*Original (v1.0):*

| Role | Typeface | Notes |
|---|---|---|
| Display / headings | **Fraunces** (serif) | Warm, characterful serif with enough weight range to feel substantial on farmer-facing hero content — avoids the generic geometric-sans-for-everything look. |
| Body / UI | **Public Sans** | Clean, highly legible at small sizes on low-end Android screens, good for forms and dense listing grids. |

- Type scale: 34px / 24px / 18px / 16px / 14px / 12px, weight 400 or 600 only — no in-between weights.
- Line length capped around 70 characters for body copy.
- Sentence case everywhere — no ALL CAPS labels, no tracked-out eyebrow text above headings.

**New in v1.1 — multilingual typography**: Fraunces and Public Sans do not cover the Devanagari script needed for Hindi and Marathi. Add a fallback token, `--font-devanagari: "Noto Sans Devanagari", sans-serif`, applied automatically whenever the interface language is set to `hi` or `mr` via i18next. Headings in Devanagari fall back to `--font-devanagari` rather than attempting to force Fraunces onto a script it doesn't support. Verify tap-target sizing and line-length rules still hold once real Hindi/Marathi copy is in place — translated strings are often longer than their English source.

### Layout principles *(unchanged)*

- Left-aligned content throughout (not centered) — this is a functional marketplace, not a marketing landing page; centered layouts read as decorative rather than task-oriented.
- Listing grids: card-based out of necessity (produce needs a photo-forward format), but avoid identical drop-shadow treatment on every card — use a simple 1px border in `--color-soil` at low opacity instead of a soft shadow, which reads less "generic SaaS template."
- Generous spacing around photos — produce photography is the trust signal, don't crowd it.

## 2. Core components

*Original (v1.0):*

| Component | Description |
|---|---|
| `Button` | Primary (`--color-harvest` fill), secondary (outline, `--color-canopy`), destructive (`--color-danger`). Active-voice labels only ("Place order", not "Submit"). |
| `Input` / `Select` | Standard form fields with inline validation messages below the field, not in a toast. |
| `ListingCard` | Photo, crop name, price/unit, distance from buyer, harvest date, provenance badge if verified. |
| `OrderStatusBadge` | Color-coded by status: pending (soil), confirmed (harvest), out_for_delivery (sky-alert), delivered (success), cancelled (danger). |
| `WeatherAlertBanner` | Full-width banner using `--color-sky-alert`, shown at top of the farmer dashboard when an active alert exists for their district. |
| `ProvenanceBadge` | Small badge + QR code icon on a listing/order detail page, links to the ledger verification view. |
| `RoleGate` | Wrapper component that conditionally renders children based on the logged-in user's role — mirrors backend permission checks, purely for UI convenience (never the actual security boundary). |
| `EmptyState` | Used for "no listings yet" / "no orders yet" — written as an invitation to act ("List your first harvest"), not a generic "no data" message. |
| `Toast` / `InlineError` | Errors speak in the interface's voice, are specific about what went wrong, never apologize vaguely. |

*New in v1.1:*

| Component | Description |
|---|---|
| `OfferCard` | Shows offer amount, quantity, buyer name and verified badge (if applicable), with accept/reject buttons for the farmer/FPO view. |
| `PriceTrendChart` | Line chart (Chart.js/Recharts) showing historical mandi prices plus an AI-predicted trend line, visually distinguished and labeled "estimated" — never presented identically to actual historical data. |
| `QualityGradeBadge` | Small badge showing a crop lot's quality grade (A/B/C). |
| `StorageCard` | Facility name, distance, available capacity, contact info. |
| `RatingStars` | Displays a buyer's aggregate rating; also used as the input control when a farmer submits a review. |
| `RatingStars` | Displays a buyer's aggregate rating; also used as the input control when a farmer submits a review. |
| `VerifiedBuyerBadge` | Trust badge (`VerifiedBadge`) shown next to a buyer's name (`🛡️ Verified Buyer`), farmer (`🌾 Verified Farmer`), or produce (`📜 Provenance Verified`). |
| `OtpModal` | 6-digit auto-advancing verification code modal with 30s resend timer and dev mock autofill bypass. |
| `LocationPicker` | OpenStreetMap Nominatim address search, HTML5 GPS detection, embedded preview map, and boundary verification. |
| `ProvenanceModal` | Cryptographic certificate modal displaying SHA-256 transaction hash, block height, and QR code verification link. |
| `ProfilePhotoModal` | Modal for uploading custom device photos via FileReader, external image URLs, or agricultural producer presets. |
| `LanguageSwitcher` | EN / HI / MR toggle, persists the choice to the user's `preferredLanguage`. |
| `MarketFinderMap` | Map component (Google Maps or OpenStreetMap) showing nearby markets/buyers relative to the user's location. |

## 3. Pages

*Original (v1.0):*

| Page | Primary components used |
|---|---|
| Login / signup | `Input`, `Button` |
| Farmer dashboard | `WeatherAlertBanner`, `ListingCard` (own listings), order summary list |
| Create/edit listing | `Input`, `Select`, photo uploader |
| Buyer browse/search | `ListingCard` grid, filter controls |
| Listing detail | `ProvenanceBadge`, `Button` (place order) |
| Order tracking | `OrderStatusBadge`, timeline of status changes |
| Payment/checkout | Razorpay checkout embed, order summary |
| Provenance verification (QR landing) | Read-only ledger detail view |

*New in v1.1:*

| Page | Primary components used |
|---|---|
| Mandi price dashboard | `PriceTrendChart`, filterable price table |
| Offers inbox (farmer/FPO view) | `OfferCard` list, accept/reject actions |
| My offers (buyer view) | `OfferCard` list, status-only (read) |
| FPO dashboard | Aggregated `ListingCard` and `OfferCard` views scoped to the FPO's own member farmers |
| Storage facility directory | `StorageCard` list, `MarketFinderMap` |
| Buyer profile / reviews | `RatingStars`, `VerifiedBuyerBadge`, review history |

## 4. API integration map

*Original (v1.0):*

| Page/action | Endpoint | Method |
|---|---|---|
| Signup | `/api/auth/signup` | POST |
| Login | `/api/auth/login` | POST |
| Refresh token | `/api/auth/refresh` | POST |
| Load farmer's own listings | `/api/listings/mine` | GET |
| Create listing | `/api/listings` | POST |
| Edit listing | `/api/listings/:id` | PUT |
| Browse/search listings | `/api/listings?crop=&lat=&lng=&radius=` | GET |
| Listing detail | `/api/listings/:id` | GET |
| Place order | `/api/orders` | POST |
| View my orders (buyer or farmer) | `/api/orders/mine` | GET |
| Update order status | `/api/orders/:id/status` | PATCH |
| Initiate payment | `/api/payments/initiate` | POST |
| Payment webhook (server-to-server, not called from frontend) | `/api/payments/webhook` | POST |
| Weather alerts for farmer's district | `/api/weather/alerts` | GET |
| Provenance detail for a listing | `/api/ledger/:listingId` | GET |

*New in v1.1:*

| Page/action | Endpoint | Method |
|---|---|---|
| Submit an offer | `/api/offers` | POST |
| Respond to an offer (accept/reject) | `/api/offers/:id/respond` | PATCH |
| View my offers (buyer or farmer/FPO) | `/api/offers/mine` | GET |
| Mandi prices | `/api/mandi-prices?crop=&market=` | GET |
| Price/demand prediction | `/api/predictions?crop=&district=` | GET |
| Submit a review | `/api/reviews` | POST |
| View a buyer's reviews | `/api/reviews/user/:userId` | GET |
| Storage facilities near a location | `/api/storage?near=lat,lng` | GET |
| Nearby markets/buyers | `/api/markets/nearby?lat=&lng=` | GET |
| Admin: set buyer verification | `/api/admin/users/:id/verify` | PATCH |

## 5. Accessibility & responsiveness

*Original (v1.0), unchanged:*
- All interactive elements have visible keyboard focus states using `--color-harvest` outline.
- Minimum tap target size 44x44px throughout, given the primary usage is mobile on modest Android hardware.
- Color is never the sole signal for status — `OrderStatusBadge` pairs color with a text label, not color alone.
- Test the full flow at 3G-throttled speed and on a small (5-inch) screen before considering any page done — this is the real target device profile, not a desktop monitor.
- Respect `prefers-reduced-motion` for any transitions (status changes, banner reveals).

*New in v1.1:*
- Language switching must not silently discard in-progress form input where avoidable — warn before switching if a form has unsaved changes.
- Translated (Hindi/Marathi) content must be tested against the same tap-target and contrast rules as English — don't assume a translation "just fits" the same layout.
- Map components (`MarketFinderMap`) must have a non-map fallback (a simple list) for low-end devices or poor connectivity where map tiles may fail to load.