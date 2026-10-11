# Farmer Marketplace

Full-stack farmer-to-consumer marketplace.

## Structure

- `frontend/` React + TypeScript + Vite + Tailwind
- `backend/` Express + TypeScript + MongoDB/Mongoose
- `docs/` product and technical documentation

## Run locally

### Backend

1. Copy `backend/.env.example` to `backend/.env`.
2. Set your MongoDB Atlas URI and JWT secrets.
3. From `backend/`:

```bash
npm install
npm run dev
```

Backend: `http://localhost:5000`

Health: `http://localhost:5000/api/health`

### Frontend

1. Copy `frontend/.env.example` to `frontend/.env`.
2. From `frontend/`:

```bash
npm install
npm run dev
```

Frontend: `http://localhost:8443` (configured to match backend CORS `CLIENT_ORIGIN`)

The frontend uses `VITE_API_URL=http://localhost:5000/api` by default.

## Implemented

- Phone/password signup and login
- Farmer/buyer roles and protected routes
- Admin role protection
- JWT access tokens held in React memory
- Refresh tokens in httpOnly cookies
- Farmer listing CRUD with image previews and stock status gauges
- Public marketplace search with case-insensitive regex & category filtering
- Product details with quantity steppers and subtotal calculations
- Cart with farmer grouping and multi-farmer checkout guidance
- Atomic MongoDB transaction-based order creation with overselling protection
- Razorpay payments with escrow hold/release lifecycle and webhook signature verification
- Downloadable and printable farm invoices & courier dispatch manifests
- Order history in interactive Stack format (latest hero order + stacked archive cards)
- Farmer command hub with IMD meteorological forecast and drying/dispatch advisory
- Farmer listings manager with multi-field search, separate category/filter controls, and grid/table views
- Profile photo upload modal (device file reader, URL, and curated farm presets) with instant persistence
- Buyer and farmer orders with status progression
- Admin user/listing/order views
- Dynamic micro-animations (card-hover-lift, btn-spring, pulse-glow, scale-in)
- Farmer weather forecast using Open-Meteo
- Phone number OTP verification with mock dev bypass (`123456`) and auto-advancing 6-digit modal on signup and login
- OpenStreetMap Nominatim location geocoding, India coordinate bounds check, and interactive GPS map picker
- Centralized input detail validation suite (canonical Indian phone, 6-digit PIN, harvest date, positive numerical bounds, string sanitization)
- Order state machine progression enforcement (`pending` → `confirmed` → `processing` → `shipped` → `delivered`)
- Dual trust accreditation: Admin buyer verification toggle (`PATCH /api/admin/users/:id/verify`) and badges (`🛡️ Verified Buyer`, `🌾 Verified Farmer`, `📜 Provenance Verified`)
- Cryptographic produce provenance ledger with SHA-256 block creation, block height, and dynamic QR certificate modal
- User-scoped isolated shopping carts in localStorage (`fm_cart_user_<userId>`) with automatic guest-to-user migration on sign-in and multi-tab sync
- APMC Mandi market price intelligence & trends directly integrated with Data.gov.in Agmarknet API and 1-click pricing helpers
- Buyer price offers & negotiation suite with transactional stock reservation (`session.withTransaction()`)
- Produce quality grading (A/B/C), post-delivery bilateral review ratings (1-5 stars), and cold storage facility directory
- Comprehensive multilingual localization (English, Hindi, Marathi) with Devanagari typography and instant LanguageSwitcher
- Decoupled, asynchronous in-app notification center with domain event triggers, unread counters, and FCM push documentation
- Full backend connectivity diagnostics suite (`npm run test` and `check-connections.ts`)

## Important

Do not commit `.env` files or secrets. Use the `.env.example` files as templates.
