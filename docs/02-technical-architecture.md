# Technical architecture document
**Project**: Farmer-to-consumer marketplace
**Stack**: MERN (MongoDB, Express, React, Node.js) + a Python AI/ML microservice (v1.1)

---

## 1. Tech stack

*Original (v1.0):*

| Layer | Choice | Why |
|---|---|---|
| Frontend (web) | React + Vite + TypeScript | Fast dev loop, team familiarity, type safety on API response shapes |
| Frontend (mobile, later) | React Native + TypeScript | Shares logic/patterns with web React |
| Backend | Node.js + Express + TypeScript | Team familiarity, fast to build REST APIs; TypeScript catches shape mismatches on money/order payloads before runtime |
| Database | MongoDB (Atlas) | Flexible schema for varied crop attributes, native geo-queries via 2dsphere |
| Auth | JWT + bcrypt | Stateless, standard, well-supported |
| File storage | Cloudinary or AWS S3 | Never store images in MongoDB directly |
| Payments | Razorpay (or PhonePe Business) | UPI support, marketplace/route features for multi-party payouts |
| Weather data | Open-Meteo API (free, reliable global and India forecasts; IMD/OpenWeatherMap optional future fallback) | Fast free integration without requiring developer API keys |
| Background jobs | node-cron or BullMQ + Redis | Decouples weather polling from request/response cycle |
| Blockchain ledger | Hyperledger Fabric (or Polygon if public verifiability is required) | Permissioned, no gas fees, no wallet burden on farmers |
| Hosting (backend) | Render or Railway | Simple deploys, free tier to start |
| Hosting (frontend) | Vercel | Zero-config React/Vite deploys |
| Error monitoring | Sentry | Catch production errors before users report them |

*New in v1.1:*

| Layer | Choice | Why |
|---|---|---|
| Market-price data | Mandi/market-price API or dataset (e.g. Agmarknet) | Current and historical mandi prices — validate licensing/reliability before committing UI around it |
| AI/ML forecasting | Python, Pandas, Scikit-learn, exposed as a small FastAPI/Flask microservice | Price trend and demand forecasting — kept as a separate deployable service, not baked into the Node backend, so it can fail independently without taking down the core app |
| Maps | Google Maps API or OpenStreetMap | Nearby market/buyer finder |
| Notifications | Firebase Cloud Messaging (push) + email fallback | Price and offer alerts — same "background job, never inline" principle as weather |
| Charts | Chart.js or Recharts | Price trend visualization and dashboard analytics on the frontend |
| Multilingual | i18next / react-i18next | Marathi, Hindi, and English support |

## 2. Project structure

```
farmer-marketplace/
├── backend/
│   ├── src/
│   │   ├── config/          # db.ts, and future third-party service configs
│   │   ├── models/          # User, Listing, Order, Payment, LedgerEntry, OtpVerification,
│   │   │                    # + new in v1.1: Offer, Review, StorageFacility, MandiPrice
│   │   ├── routes/          # auth, listing, order, payment, weather, admin, location, ledger routes
│   │   ├── controllers/     # auth, listing, order, payment, weather, admin, location, ledger controllers
│   │   ├── middleware/      # auth.middleware.ts, errorHandler.ts, rateLimit.ts
│   │   ├── services/        # weather.service.ts, payment.service.ts, ledger.service.ts,
│   │   │                    # otp.service.ts, location.service.ts (OpenStreetMap geocoding),
│   │   │                    # + new in v1.1: mandiPrice.service.ts, prediction.service.ts (calls ai-service),
│   │   │                    # notification.service.ts, maps.service.ts
│   │   ├── utils/           # validation.ts, AppError.ts, receipt.ts
│   │   ├── jobs/            # scheduled jobs: weather polling,
│   │   │                    # + new in v1.1: mandiPriceSync.job.ts
│   │   ├── app.ts           # Express app + middleware wiring
│   │   └── server.ts        # entry point: loads env, connects DB, starts server
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # axios client + one file per resource
│   │   ├── components/      # shared UI components
│   │   ├── pages/           # route-level page components
│   │   ├── context/         # AuthContext (current user, role, token)
│   │   ├── hooks/           # custom hooks (useAuth, useListings)
│   │   ├── locales/         # NEW in v1.1: en.json, hi.json, mr.json (i18next translation files)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   └── package.json
├── ai-service/               # NEW in v1.1: separate Python microservice, not part of the Node backend
│   ├── app/
│   │   ├── main.py          # FastAPI/Flask entry point
│   │   ├── model.py         # price-trend/demand prediction logic (Pandas + Scikit-learn)
│   │   └── data/            # cached/historical mandi price data used for training
│   ├── requirements.txt
│   └── README.md            # notes that this service is optional to run locally; the Node
│                             # backend must treat it as best-effort and degrade gracefully if it's down
└── README.md
```

## 3. Database schema

*Original (v1.0):*

### `users`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | required |
| `phone` | String | required, unique, used for OTP login |
| `email` | String | optional |
| `passwordHash` | String | bcrypt hash, never store plaintext |
| `role` | String enum: `farmer`, `buyer`, `admin`, **`fpo` (new in v1.1)** | required |
| `avatar` | String | optional profile image URL or data |
| `location` | GeoJSON Point | `{ type: "Point", coordinates: [lng, lat] }`, indexed `2dsphere` |
| `district` | String | used for weather alert targeting |
| `isPhoneVerified` | Boolean | verified via OTP |
| **`isVerifiedBuyer`** | **Boolean (new in v1.1)** | **default `false`; settable only via an admin-only route, never by the user's own profile update** |
| `verificationDetails` | Object | `{ verifiedAt: Date, verifiedBy: ObjectId, notes: String }` |
| **`preferredLanguage`** | **String enum: `en`, `hi`, `mr` (new in v1.1)** | **default `en`** |
| `createdAt` | Date | |

### `otpverifications`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `phone` | String | required, indexed |
| `otpHash` | String | bcrypt/crypto hashed OTP |
| `purpose` | String enum: `signup`, `login`, `verify_phone` | default `login` |
| `attempts` | Number | max 3 attempts before invalidation |
| `expiresAt` | Date | TTL indexed (expires automatically in 10 minutes) |
| `createdAt` | Date | |

### `listings`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `farmerId` | ObjectId | ref `users`, required (may reference an `fpo`-role user acting on behalf of members) |
| `cropName` | String | required |
| `quantity` | Number | required, ≥ 0 |
| `unit` | String enum: `kg`, `quintal`, `dozen`, `piece`, `ton`, `crate`, `bunch`, `litre` | |
| `pricePerUnit` | Number | required, > 0 |
| `harvestDate` | Date / String | required, formatted as YYYY-MM-DD |
| `photos` | [String] | Cloudinary/S3/URL links |
| `location` | GeoJSON Point | for proximity search, indexed `2dsphere` |
| `status` | String enum: `active`, `sold`, `expired`, `deleted` | soft delete marks `status: "deleted", isActive: false` |
| `isActive` | Boolean | default `true`, used for soft delete |
| **`qualityGrade`** | **String enum: `A`, `B`, `C`** | **set by farmer at creation/edit; rating-based grading with cryptographic ledger tag** |
| `createdAt` | Date | |

### `orders`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `buyerId` | ObjectId | ref `users` |
| `farmerId` | ObjectId | ref `users` |
| `listingId` | ObjectId | ref `listings` |
| `quantityOrdered` | Number | |
| `pricePerUnitAtOrder` | Number | snapshot at order time — never trust the live listing price for historical orders |
| `totalAmount` | Number | |
| `status` | String enum: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled` | strict state machine progression enforced server-side |
| `deliveryAddress` | Object | `{ fullName: String, phone: String, street: String, district: String, state: String, pincode: String }` |
| **`offerId`** | **ObjectId, optional (new in v1.1)** | **ref `offers` — set when this order originated from an accepted offer rather than a direct purchase** |
| `createdAt` | Date | |
| `updatedAt` | Date | |

### `payments`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `orderId` | ObjectId | ref `orders` |
| `razorpayPaymentId` | String | from gateway |
| `amount` | Number | |
| `status` | String enum: `initiated`, `captured`, `held`, `released`, `refunded`, `failed` | |
| `webhookEventLog` | [Object] | append-only log of raw webhook events for audit |
| `createdAt` | Date | |

### `ledgerentries`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `listingId` | ObjectId | ref `listings` |
| `farmerId` | ObjectId | ref `users` |
| `txHash` | String | SHA-256 cryptographic provenance transaction reference |
| `blockNumber` | Number | simulated or testnet blockchain block height |
| `network` | String | default `Polygon-Amoy-AgriLedger` (PoS Decentralized) |
| `harvestDate` | Date | mirrored from listing at write time |
| `qualityTag` | String | e.g. "organic", "A-Grade Certified" — mirrors `qualityGrade` on `listings` |
| `verifiedAt` | Date | immutable timestamp of farm gate ledger registration |

### `weatheralerts`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `district` | String | |
| `alertType` | String enum: `heavy_rain`, `frost`, `heatwave` | |
| `message` | String | |
| `sentAt` | Date | |

*New in v1.1:*

### `offers`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `listingId` | ObjectId | ref `listings`, required |
| `buyerId` | ObjectId | ref `users`, required |
| `farmerId` | ObjectId | ref `users`, required (denormalized from the listing for query convenience) |
| `offerPrice` | Number | required, > 0 — proposed price per unit |
| `offerQuantity` | Number | required, > 0 |
| `status` | String enum: `pending`, `accepted`, `rejected`, `expired` | default `pending` |
| `expiresAt` | Date | required — offers auto-expire rather than staying open indefinitely |
| `createdAt` | Date | |
| `respondedAt` | Date | optional |

### `reviews`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `reviewerId` | ObjectId | ref `users` — the farmer/FPO leaving the review |
| `targetUserId` | ObjectId | ref `users` — the buyer being reviewed |
| `orderId` | ObjectId | ref `orders`, required — review only allowed once this order's status is `delivered` |
| `rating` | Number | required, 1–5 |
| `comment` | String | optional |
| `createdAt` | Date | |

### `storagefacilities`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | required |
| `location` | GeoJSON Point | indexed `2dsphere`, for proximity search |
| `district` | String | |
| `totalCapacity` | Number | optional, units defined per facility type |
| `availableCapacity` | Number | admin-updated, not real-time in v1.1 |
| `contactInfo` | String | |
| `createdBy` | ObjectId | ref `users` (admin) — this collection is admin-curated, not self-service, in v1.1 |
| `createdAt` | Date | |

### `mandiprices`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `cropName` | String | required, trimmed, indexed (e.g. "Wheat", "Garlic", "Tomato") |
| `variety` | String | trimmed, default "Standard" (e.g. "Desi", "Hybrid", "Lokwan") |
| `marketName` | String | required, trimmed, indexed — the APMC mandi yard |
| `district` | String | required, trimmed, indexed |
| `state` | String | trimmed, default "Maharashtra" |
| `minPrice` | Number | required, min 0 (₹ per quintal) |
| `maxPrice` | Number | required, min 0 (₹ per quintal) |
| `modalPrice` | Number | required, min 0 — benchmark wholesale trading rate (₹ per quintal) |
| `unit` | String | default "quintal" (100 kg) |
| `priceDate` | String | ISO `YYYY-MM-DD` date of the market trading session (indexed) |
| `source` | String | `Data.gov.in / Agmarknet` |
| `ingestedAt` | Date | timestamp when record was upserted |

*Compound Indexes:*
- `{ cropName: 1, variety: 1, marketName: 1, priceDate: 1 }` (`unique: true`) — ensures idempotent upserts and strictly zero duplicate rows.
- `{ cropName: 1, district: 1, priceDate: -1 }` — fast lookups for benchmark price and district-specific queries.
- `{ priceDate: -1, cropName: 1 }` — optimized historical trends and latest crop summaries.

## 4. Environment configuration

### Backend `.env`

*Original (v1.0):*

| Variable | Purpose |
|---|---|
| `PORT` | Port the Express server listens on |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Signing key for access tokens — long, random, never committed |
| `JWT_EXPIRES_IN` | Access token lifetime (e.g. `30m`) |
| `JWT_REFRESH_SECRET` | Separate signing key for refresh tokens — must differ from `JWT_SECRET` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `CLIENT_ORIGIN` | Allowed CORS origin for the frontend |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment gateway credentials (phase 4) |
| `CLOUDINARY_URL` | Image storage credentials (phase 2) |
| `WEATHER_API_KEY` | IMD/OpenWeatherMap API key (phase 5) — actual implementation uses Open-Meteo, which does not require a key |
| `LEDGER_NETWORK_URL` | Hyperledger Fabric or Polygon RPC endpoint (phase 6) |

*New in v1.1:*

| Variable | Purpose |
|---|---|
| `DATA_GOV_API_KEY` | Open Government Data (Data.gov.in) API key for official Agmarknet wholesale mandi prices |
| `DATA_GOV_MANDI_RESOURCE_ID` | Agmarknet commodity daily price bulletin resource ID (`9ef84268-d588-465a-a308-a864a43d0070`) |
| `MANDI_REFRESH_INTERVAL_HOURS` | Frequency in hours between scheduled background rate synchronization via `node-cron` (default: 24) |
| `MANDI_DATA_RETENTION_DAYS` | Number of days to retain historical records in MongoDB before automated cleanup (default: 90) |
| `AI_SERVICE_URL` | Base URL of the Python AI/ML microservice (phase 8) — the Node backend must handle this being unreachable gracefully |
| `GOOGLE_MAPS_API_KEY` | Maps API key for the nearby market/buyer finder (phase 11) — restrict by domain/referrer, never ship unrestricted |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging server key for push notifications (phase 11) |

### Frontend `.env`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |
| **`VITE_GOOGLE_MAPS_API_KEY`** | **(new in v1.1) client-side Maps API key — must be a separate, domain-restricted key from the backend's, never the same key** |

### `ai-service/.env` *(new in v1.1)*

| Variable | Purpose |
|---|---|
| `MODEL_DATA_PATH` | Path to the historical mandi price data used for training/inference |
| `PORT` | Port the Python service listens on |

## 5. API design conventions

- REST resource naming: `/api/auth` (including `/otp/send` and `/otp/verify`), `/api/listings`, `/api/orders`, `/api/payments`, `/api/weather`, `/api/location` (OpenStreetMap Nominatim search, reverse, verify), `/api/ledger` (cryptographic provenance verification), `/api/admin` (dispute override, stats, and `/users/:id/verify`), and new in v1.1: `/api/offers`, `/api/reviews`, `/api/storage`, `/api/mandi-prices`, `/api/predictions`, `/api/markets/nearby`.
- Every protected route requires `Authorization: Bearer <token>`.
- Consistent response shape: `{ data: ... }` on success, `{ error: "message" }` on failure.
- Pagination on list endpoints via `?page=&limit=` query params, response includes `{ data, page, totalPages }`.
- All mutating routes (`POST`/`PUT`/`PATCH`/`DELETE`) validate input server-side regardless of frontend validation via `backend/src/utils/validation.ts`.
- **Shopping Cart Isolation**: Client-side cart state in `CartContext.tsx` is strictly partitioned per user ID (`fm_cart_user_<userId>`) and `fm_cart_guest` for unauthenticated sessions, with automatic guest cart migration upon signup/login and multi-tab synchronization.
- **New in v1.1**: any route that calls the AI service or an external market-price source must timeout quickly and degrade gracefully (return cached/last-known data or a clear "unavailable" response) rather than hanging the request.