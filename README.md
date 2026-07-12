# Car Marketplace Platform

An enterprise-grade car selling platform (Phase 1 MVP) built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Prisma.

The brand name (default: "Nahda Motors") is **never hardcoded** — it is stored in the database and editable at **Admin → Site settings**, applying instantly across the whole app (header, footer, titles, hero, maintenance page).

## Quick start

```bash
npm install
npm run db:push     # create SQLite schema
npm run db:seed     # load demo data
npm run dev         # http://localhost:3000
```

## Demo accounts (password: `Passw0rd!`)

| Email | Role |
|---|---|
| admin@demo.test | Administrator |
| moderator@demo.test | Moderator |
| dealer@demo.test | Dealership |
| seller@demo.test / seller2@demo.test | Private sellers |
| buyer@demo.test / buyer2@demo.test | Buyers |
| inspector@demo.test | Inspector |

## What's implemented (Phase 1 MVP)

- **Auth & RBAC** — email/password with bcrypt, JWT session cookies, 8 roles (buyer, seller, dealer, inspector, logistics, finance, moderator, admin), suspended-account blocking, middleware route protection
- **Listings** — creation wizard with real **NHTSA VIN decoding**, 20+ spec fields, features checklist, photo upload (up to 30), listing tiers (Free/Premium/Ultimate), duplicate-VIN detection, moderation workflow (pending → approve/reject with reason)
- **Search & discovery** — faceted filters (make, model, price, year, mileage, body style, fuel, transmission, condition, location), keyword search, 6 sort orders, pagination, saved searches, featured/trending/new-arrivals rails, similar vehicles, compare tool (up to 4)
- **Pricing intelligence** — market-based price confidence badges (Great/Good/Fair/High) computed from comparable listings, market average, monthly payment estimator
- **Communication & negotiation** — buyer↔seller messaging threads, structured offers with accept/reject/counter/withdraw and counter-acceptance, test drive scheduling
- **Trust & safety** — inspections (request → staff completes with 0-100 score and report), verified badges, audit log of all admin actions
- **Admin panel** — KPI dashboard (GMV, revenue at configured take rate, users, listings, open inspections), moderation queue with tier control, user management (role/status/verification), inspection management, **site settings** (brand name, tagline, hero text, banner upload, fee %, currency, support email, maintenance mode)
- **Transactions (simplified)** — accepted offers mark vehicles sold at the agreed price, feeding GMV/revenue analytics

## Architecture notes

- SQLite via Prisma for zero-config local dev — switch `datasource` provider to `postgresql` for production (schema is compatible; enums are modeled as constrained strings)
- Server Components + Server Actions (no client API surface to secure separately)
- Placeholder vehicle images are generated as deterministic SVGs (`/api/placeholder`) so the demo runs fully offline; uploaded photos are stored under `public/uploads/`
- Roadmap alignment for later phases: payments/escrow provider, real ID verification, Elasticsearch, event bus, mobile apps (see PRD)
