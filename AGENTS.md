# AGENTS.md
Read this file first, every time, before writing any code in this repo. If you are an AI assistant (Claude, ChatGPT, Copilot, or otherwise) picking up this project, this file plus `PROGRESS.md` should give you everything you need without the human having to re-explain the project.

## Before you do anything
1. Read `PROGRESS.md` to see what's already built and what's next. Don't redo completed work, don't skip ahead of the current phase.
2. Read the relevant doc in `docs/` for the area you're touching (see map below).
3. After finishing a task, update `PROGRESS.md` yourself — see the instructions at the top of that file. Do this before ending your turn, not "later."

## What this project is
A farmer-to-consumer marketplace (India-focused) with three parts: direct produce sales (no middlemen), localized weather advisory for farmers, and a blockchain-based provenance ledger for buyers to verify produce origin. Full context in `docs/01-PRD.md`.

## Tech stack (do not change without discussion)
- Backend: Node.js + Express + TypeScript, MongoDB via Mongoose
- Frontend: React + Vite + TypeScript
- Auth: JWT (access + refresh), bcrypt for passwords
- Payments: Razorpay, UPI-based, escrow-style hold/release — never blockchain for money
- Blockchain: used only for the provenance ledger (harvest date, farmer ID, quality tag), not payments
- Weather: IMD API / OpenWeatherMap, polled via a scheduled background job, never inline in a request

## Doc map — read before touching this area
| Working on... | Read first |
|---|---|
| Any new feature, unsure if in scope | `docs/01-PRD.md` |
| Folder structure, DB schema, env vars, adding a new service | `docs/02-technical-architecture.md` |
| Auth, roles, permissions, anything payment or order related | `docs/03-security-and-access.md` |
| UI components, colors, layout, API calls from frontend | `docs/04-frontend-specification.md` |
| Deciding what to build next | `docs/05-feature-tickets.md` |
| Deciding whether to write it yourself or let AI vibe-code it | `docs/06-build-guide-dos-and-donts.md` |

## Hard rules — do not violate these regardless of what else you're asked

1. **Never trust client-sent price or quantity.** Always re-fetch the current listing server-side when creating an order and use that value, never the value the frontend sent.
2. **Order creation must be wrapped in a MongoDB transaction** (`session.withTransaction()`) that recchecks stock and decrements it atomically with creating the order record. No exceptions, even for a "quick test."
3. **Every protected route checks role server-side** via middleware. Never rely on the frontend hiding a button as the security boundary.
4. **Passwords are always bcrypt-hashed.** Never log, store, or return a plaintext password, even in a debug statement.
5. **Payment webhook handling must be idempotent** — check the gateway's event ID for duplicates before processing, since gateways can and do send the same webhook twice.
6. **No raw card/UPI credential handling in our own code.** Always use the payment gateway's hosted checkout/SDK flow.
7. **Blockchain writes are best-effort and async.** A ledger write failure must never block or fail a listing creation.
8. **All new environment variables go in both `.env.example` files** (backend or frontend, whichever applies) with a comment explaining what they're for — never just in a local `.env`.
9. **Every new Mongoose model gets a matching TypeScript interface** (e.g. `IUser`, `IListing`) — don't leave schema fields untyped.
10. **Don't introduce a new major dependency or change the tech stack** without flagging it to the human first — this includes swapping libraries, adding new external services, or changing folder structure.

## How to run this project
See the root `README.md` for setup and run commands — don't duplicate them here, keep that the single source of truth for run instructions.

## When you're unsure
If a request conflicts with something in `docs/` or these hard rules, say so explicitly rather than silently picking one side. Flag the conflict to the human and ask, don't guess.
