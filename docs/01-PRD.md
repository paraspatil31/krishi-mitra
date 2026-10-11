# Product requirements document (PRD)
**Project**: Farmer-to-consumer marketplace with agri-advisory, blockchain provenance, and market intelligence
**Version**: v1.1 (expanded scope — incorporates the Farmer Market Intelligence & Buyer Linkage System brief)

> **v1.1 note**: This version adds market-intelligence and trust features (mandi prices, AI forecasting, buyer verification, offers, quality grading, storage visibility, reviews, multilingual support, FPO role) on top of the original v1.0 scope. Nothing from v1.0 is removed — see each section for what's new vs. original.

---

## 1. Problem statement

Farmers in India lose a significant share of their margin to middlemen (mandis, aggregators, commission agents) between harvest and the end consumer. At the same time, buyers have no visibility into where their produce comes from, how fresh it is, or whether it was grown responsibly. Farmers also lack timely, localized weather guidance, leaving them exposed to preventable crop loss from rain, frost, or heat events.

**New in v1.1**: farmers also lack real-time visibility into current mandi (market) prices and price trends, which weakens their negotiating position even on this platform — a farmer who doesn't know today's fair price can't tell whether a buyer's offer is good. Buyers, meanwhile, have no way to distinguish a trustworthy counterparty from an unverified one, and no structured way to negotiate price on a specific lot rather than accepting a fixed listing price.

Existing platforms solve pieces of this: B2B commodity marketplaces exist for trader-to-trader trade, agri-input platforms sell farmers what they need to grow, and government mandis handle bulk price discovery. None of them combine **direct farmer-to-consumer retail**, **localized weather advisory**, **verifiable produce provenance**, and **live market price intelligence with negotiated offers** in one product built for the small/marginal farmer.

## 2. Goals

*Original (v1.0):*
- Let farmers list and sell produce directly to nearby consumers, cutting out middlemen and improving farmer margins.
- Give farmers timely, actionable weather alerts tied to their specific location and crop.
- Give buyers a transparent, verifiable record of where their produce came from (provenance), building trust that direct-from-farm claims are genuine.
- Build a repeatable regional playbook (start in one district, prove retention, then expand) rather than a thin pan-India rollout.

*New in v1.1:*
- Give farmers live mandi price visibility and AI-assisted price/demand trend estimates, so they can negotiate from an informed position rather than accepting the first offer.
- Let buyers submit negotiated offers on a crop lot (not just buy at a fixed listing price), and let farmers accept or reject with full pricing context.
- Build trust in both directions: verified buyer profiles, crop quality grading, and a ratings/review system.
- Support Farmer Producer Organizations (FPOs) that aggregate and represent multiple member farmers' lots.
- Make storage facility availability visible, to reduce post-harvest loss from farmers holding unsold produce with nowhere to store it.
- Serve farmers in their own language — Marathi, Hindi, and English — rather than English-only.

## 3. Non-goals (out of scope for v1.1)

*Original (v1.0), still out of scope:*
- Bulk/wholesale trading (mandi-scale transactions) — this is a retail, small-batch product.
- AI-based crop disease detection from photos — planned for a later phase once there's usage data to train against. (Distinct from the AI price/demand forecasting added in v1.1, which is in scope.)
- Farmer input purchasing (seeds, fertilizer) — a different product; don't scope-creep into it.
- Full logistics/delivery fleet management — v1 assumes farmer-arranged delivery or buyer pickup, with a delivery-partner integration considered post-MVP.
- Cryptocurrency payments — payments stay on UPI/bank rails; blockchain is used only for the provenance ledger (see architecture doc).

*New in v1.1, explicitly out of scope for now:*
- Automated/AI-driven buyer verification (e.g. instant document OCR + fraud scoring) — v1.1 verification is a manual admin-review process, not automated.
- Self-service storage facility listings from third parties — the storage directory is admin-curated initially, to avoid spam or fake capacity claims.
- Real-time bidding/auction mechanics on offers — offers are simple accept/reject, not competitive multi-buyer bidding.
- Support for languages beyond Marathi, Hindi, and English.

## 4. Target users

**Farmer (seller)** *(original)*
- Small to medium-scale farmer, primarily selling fruits/vegetables/grains in small batches.
- Likely using a low-to-mid-range Android phone, variable connectivity, moderate digital literacy.
- Primary motivation: better margin per sale, fewer middlemen, protection from weather-related crop loss.
- **New in v1.1**: also wants to know today's fair market price before accepting or countering a buyer's offer, and wants visibility into nearby storage if produce isn't selling immediately.

**Buyer (consumer)** *(original)*
- Urban or peri-urban household, small restaurant, or local retailer wanting fresh, traceable produce direct from source.
- Motivated by freshness, price, and (for a meaningful segment) verified origin/organic claims.
- **New in v1.1**: wants to negotiate on price for larger or repeat purchases, and wants a way to signal trustworthiness (verification) to farmers who may be wary of unknown buyers.

**FPO — Farmer Producer Organization** *(new in v1.1)*
- An organization representing a group of member farmers, typically with more negotiating leverage and logistics capability than an individual smallholder.
- Aggregates multiple members' crop lots, views and responds to offers on their behalf, and gets a consolidated dashboard rather than one farmer's view.
- Motivation: better prices through aggregated volume, reduced per-farmer administrative burden.

## 5. Core features

*Original (v1.0):*

| # | Feature | Description |
|---|---|---|
| 1 | Farmer & buyer accounts | Signup/login with phone or email, role-based access. |
| 2 | Produce listings | Farmer creates listings with photos, price, quantity, harvest date, location. |
| 3 | Browse & search | Buyer browses/filters listings by crop, location, price. |
| 4 | Orders | Buyer places an order; farmer confirms; status tracked through to delivery. |
| 5 | Payments (UPI, escrow-style) | Buyer pays on order; funds held until delivery confirmed, then released to farmer. |
| 6 | Weather advisory | District-level forecast monitoring with push/SMS alerts for heavy rain, frost, heatwave. |
| 7 | Blockchain provenance ledger | Each listing's harvest date, farmer ID, and quality tag written to a ledger; buyer can view/verify via QR code. |

*New in v1.1:*

| # | Feature | Description |
|---|---|---|
| 8 | Crop lots & quality grading | Farmers/FPOs create crop lots with a simple rating-based quality grade, in addition to the existing listing fields. |
| 9 | Live mandi price tracking | Display current and historical mandi/market prices per crop, sourced from a market-price API or dataset. |
| 10 | AI price/demand forecasting | A separate service estimates future price/demand trends from historical mandi data, shown as a labeled estimate — never a guarantee. |
| 11 | Verified buyer profiles & online offers | Buyers can be admin-verified; verified or unverified buyers can submit a negotiated offer on a crop lot, which the farmer/FPO accepts or rejects. |
| 12 | Buyer ratings & reviews | Farmers can rate and review buyers after a completed (delivered) order, building a trust record over time. |
| 13 | Storage facility directory | Admin-curated list of nearby storage/warehouse facilities with available capacity, to reduce post-harvest loss. |
| 14 | Price & offer notifications | Push (Firebase Cloud Messaging) or email alerts for significant price changes and new/responded offers. |
| 15 | Role-based dashboards | Separate dashboard views for farmer, buyer, and FPO roles, each showing relevant summaries. |
| 16 | Nearby market/buyer finder | Map-based (Google Maps API or OpenStreetMap) discovery of nearby markets and buyers. |
| 17 | Multilingual support | Full interface support for Marathi, Hindi, and English via i18next. |

## 6. User flows

### Farmer flow *(original, unchanged)*
1. Sign up, select role "Farmer", verify phone.
2. Complete a minimal profile (name, location, primary crops).
3. Create a listing: photos, crop, quantity, price, harvest date.
4. Listing goes live; farmer receives weather alerts relevant to their district in parallel.
5. Buyer places an order — farmer gets notified, confirms availability.
6. Farmer arranges delivery/pickup.
7. Once buyer confirms delivery, farmer receives payment (escrow release).
8. Farmer can view sales history and repeat-buyer requests.

### Buyer flow *(original, unchanged)*
1. Sign up, select role "Buyer".
2. Browse or search listings by crop/location.
3. View listing detail, including provenance badge (once phase 6 ledger is live).
4. Place order, pay via UPI (held in escrow).
5. Track order status (confirmed → out for delivery → delivered).
6. Confirm delivery — this triggers escrow release to the farmer.
7. Optionally rate the farmer/produce.

### Offer flow *(new in v1.1)*
1. Buyer views a crop lot's listing detail, including its current quality grade and (if available) the live mandi price for that crop, for pricing context.
2. Instead of (or in addition to) buying at the listed price, buyer submits an offer: a proposed price and quantity.
3. Farmer/FPO sees the offer alongside current mandi price context and accepts or rejects it.
4. If accepted, the offer converts into an order using the same stock-safe transaction logic as a direct purchase — stock is rechecked and decremented atomically at acceptance time, not just at the time the offer was submitted.
5. If rejected or expired (offers have a time window), the buyer is notified and the crop lot's stock is untouched.

### FPO flow *(new in v1.1)*
1. FPO signs up with role "FPO", representing a group of member farmers.
2. FPO dashboard aggregates crop lots and offers across its member farmers (scoped so it never sees other FPOs' or unaffiliated farmers' data).
3. FPO can create/manage lots and respond to offers on behalf of its members, using the same underlying listing/order/offer logic as an individual farmer.

## 7. Success metrics

*Original (v1.0):*

| Metric | Why it matters |
|---|---|
| Number of active farmers (listed ≥1 item in last 30 days) | Core supply-side health |
| Number of repeat buyers (2+ orders) | Signals real trust and retention, not just novelty use |
| Order completion rate (delivered / placed) | Flags fulfillment or trust breakdowns early |
| Average farmer margin uplift vs. mandi price (self-reported or estimated) | The core value proposition — validate it's actually true |
| Weather alert engagement (opened / acted on) | Confirms the advisory feature is useful, not ignored |
| Provenance QR scan rate | Confirms buyers actually value and use the blockchain-verified trail |
| Payment dispute/refund rate | Flags trust or escrow-flow problems early |

*New in v1.1:*

| Metric | Why it matters |
|---|---|
| Offer acceptance rate | Signals whether the negotiation flow is actually useful vs. just adding friction |
| Average accepted-offer price vs. live mandi price at time of offer | Now directly measurable (not just self-reported) — the core "margin uplift" metric from v1.0 gets sharper |
| Verified buyer share of total buyers | Tracks adoption of the trust-building feature |
| Storage directory view-to-inquiry rate | Confirms the storage feature is actually consulted, not just present |
| Multilingual adoption (% of sessions in Hindi/Marathi vs. English) | Validates the multilingual investment was necessary and used |
| AI price prediction accuracy (predicted vs. actual, tracked retrospectively) | Keeps the forecasting feature honest — don't keep showing predictions if they're consistently wrong |

## 8. Assumptions & risks

*Original (v1.0):*
- **Assumption**: farmers have smartphone + basic data access. Risk: last-mile digital literacy may require phone-based onboarding support in early regions.
- **Assumption**: UPI is a familiar, trusted payment method for target buyers and farmers. This is generally safe in India but worth validating in the specific launch region.
- **Risk**: delivery/logistics is not solved by this product in v1 — early adoption may stall if farmers can't reliably fulfill orders. Mitigate by starting hyperlocal (single district) where farmer-arranged delivery is feasible.
- **Risk**: blockchain provenance is a differentiator, not a retention driver on its own — don't over-invest here before the core marketplace loop (listing → order → payment) is proven.

*New in v1.1:*
- **Risk**: mandi price data availability and reliability vary significantly by region and source. Validate a real, licensable data source (e.g. Agmarknet or an equivalent government/commercial feed) before committing UI/UX around "live" prices — don't launch a price feature on scraped or unreliable data.
- **Risk**: AI price/demand predictions are only as good as the historical data available at launch, which will be thin initially. Frame every prediction as an estimate, not a guarantee, in both UI copy and internal risk posture — a bad prediction that a farmer acted on is a trust-destroying event.
- **Risk**: buyer verification adds friction to buyer onboarding. Keep it optional at first (verified badge as a trust signal, not a gate to using the platform) rather than mandatory, to avoid suppressing buyer-side growth.
- **Assumption**: FPOs are a smaller, more sophisticated user segment than individual farmers and can tolerate a slightly more complex dashboard — don't let FPO-specific complexity leak into the individual farmer experience.