# Sardar And Malik Store — standalone public web store

A complete, ready-to-deploy copy of the "Sardar And Malik Store" online shop,
rebuilt as a plain Node.js app (zero runtime dependencies) so it can live on
real public hosting with a public link anyone can open.

## What is inside

- **21,873 products across 29 categories** — the original 298-product
  catalogue from the live store, plus **21,575 verified real Markaz
  listings** added by sweeping Markaz's own public browse API
  (`markaz.app/api/shop/browse`, 31 categories, up to 63 pages each).
  Every added product is a real Markaz listing with its real Markaz name
  and real Markaz base price — no generated variants, no invented prices.
  Products were kept only if they had a price, in-stock quantity, a
  verified photo (see below), and a name not already in the catalogue
  (22,231 same-name relistings were dropped, not duplicated).
- **Prices: Markaz base + 750 PKR**, with a struck-through price of
  selling + 350 PKR (e.g. a 100 PKR Markaz product sells at 850 PKR with
  1,200 PKR struck through). New products added from the panel get +750 too.
- **98,426 starter reviews** (4–5 per product), gender-matched to the
  product with Pakistani names and cities, in Roman Urdu — the same style
  as the live store. No name is repeated within one product.
- **Product photos: 21,847 of 21,873 products have their own real Markaz
  photo.** The original 272 keep their local verified photos
  (`public/photos/<id>.jpg`). The 21,575 added products carry their
  verified Markaz thumbnail URL (21,571 on `static.markaz.app`, 4 on
  `cbu01.alicdn.com` — the Markaz China listings whose images live on
  Alibaba's CDN; still the real listing photo from Markaz's own API).
  Each photo URL was checked reachable with an image content type before
  the product was added (31,761 of 31,788 swept listings verified; 27
  failed and were dropped). The storefront shows the photo with the
  category emoji tile behind it as a fallback if an image fails to load.
  **26 products still show the category emoji tile only** (see below).
- **Catalogue browsing is paginated** (48 products per page, "Load more"
  button) so the 21,873-product catalogue loads fast; search and category
  filters work across the whole catalogue.
- **Customer accounts**: register with Gmail or phone number + password,
  login again with the same account.
- **My Orders** with live tracking: Received → Confirmed → Packed → Shipped
  → Delivered, updated when the owner changes the status.
- **7-day returns**: customers request a return from My Orders with a reason;
  the owner approves/rejects it in the panel.
- **Payments**: Cash on Delivery + Easypaisa/JazzCash advance payment to
  03169057378 (Qasim Tariq), with a transaction ID field for advance payments.
- **Owner Panel**: opened from the footer "Owner Login", password-locked,
  shows all orders, status controls, return requests, and an Add Product form.
  The password comes only from the `PANEL_PASSWORD` environment variable —
  it is never written in code, logs, or the public site.
- Markaz-style layout: green ticker, navy header, hero + search, category
  chips, trending grid, trust strip, FAQ, footer.

## What is NOT in this package (honest gaps)

- **26 products have no real Markaz photo** (the original 298's gaps:
  IDs 57, 59, 61, 72, 73, 74, 102, 106, 123, 124, 148, 151, 154, 158,
  163, 165, 177, 217, 240, 251, 252, 253, 270, 288, 289, 293). No
  verified Markaz photo could be found for them after exhaustive
  searching — see `PHOTO-COVERAGE.md` for the exact list and reasons
  (e.g. Markaz carries no physical Quran Pak, no sherwani, no air-fryer
  unit, no extension board). They show the category emoji tile. No wrong
  or lookalike photo was attached to any product.
- **The added products' photos are hotlinked, not downloaded locally**
  (21,575 remote URLs). They were each verified reachable, but they were
  not individually eyeballed the way the original 272 local photos were.
  If Markaz changes or removes a listing photo, that product falls back
  to its emoji tile.
- **Markaz's full catalogue is not here**: Markaz lists 150,000+
  products in Pakistan and millions from China, and its browse API caps
  each category at 10,000 results. This package holds 21,873 verified
  listings — every product whose name is distinct in the catalogue —
  not a literal copy of Markaz's whole catalogue.
- **Existing customers/orders from the Muse store do not carry over** — the
  public store starts with an empty accounts/orders database. The catalogue
  and reviews are the same; people re-register on the public link.

## Run locally (free, no accounts)

```bash
node server.js
# then open http://localhost:3000
# Panel login needs a password:  PANEL_PASSWORD=test123 node server.js
```

No `npm install` is needed for local use (zero dependencies).

## Deploy — recommended path: Render free tier (no card, no commercial ban)

Render's free tier (verified October 2026): **no credit card required**;
free web services spin down after 15 minutes without traffic and take about
a minute to wake; 750 free instance hours per workspace per month; free
Postgres expires 30 days after creation and is deleted 14 days later.
Render's own docs say: "Do not use them for production applications."
There is **no persistent disk on the free tier**, so the local SQLite file is
wiped whenever the service restarts or redeploys.

For durable data (accounts, orders) attach a free Postgres database:

- **Neon free tier** — Postgres, no expiry found; scales to zero after ~5
  minutes idle and wakes on the next request. Needs a free Neon account.
- **Supabase free tier** — Postgres, 500 MB; projects pause after 7 days of
  inactivity and can be reactivated. Needs a free Supabase account.

Set `DATABASE_URL` to that Postgres connection string and `PANEL_PASSWORD`
to the panel password on the host. `render.yaml` in this folder already
declares the free web service.

See **DEPLOY-STEPS.md** for the exact click-by-click steps.

## Deploy — alternative: Vercel (only after the user connects Vercel)

The `api/index.js` entry lets the same app run as a Vercel Serverless
Function, but two things block it today:

1. Vercel is **not connected** in this Muse environment — the user must
   sign in to their own free Vercel account first.
2. Vercel's free **Hobby plan is for personal, non-commercial use only**.
   A shop that sells products is commercial, so Hobby's terms do not cover
   this store; Pro is $20/month. On Vercel a `DATABASE_URL` (free
   Neon/Supabase Postgres) is also required, because serverless functions
   have no persistent local disk.

## Security notes

- Never put the real panel password in code, a committed `.env` file, or a
  chat message. Set it only as a secret environment variable on the host.
- Customer passwords are stored as scrypt hashes, never in plain text.
- Sessions are random 256-bit tokens. Customers can only see their own
  orders and returns; the panel requires its own token.

## Files

| File | What it is |
|---|---|
| `server.js` | The whole backend + static file serving |
| `api/index.js` | Vercel serverless entry point (optional) |
| `public/` | Storefront (HTML/CSS/JS) |
| `data/products.json` | 21,873-product catalogue (298 original + 21,575 verified Markaz listings) |
| `data/reviews.json` | 98,426 generated starter reviews |
| `seed-reviews.js` | Regenerates `data/reviews.json` |
| `render.yaml` | Render free web service definition |
| `.env.example` | Environment variables to set on the host |
| `DEPLOY-STEPS.md` | Exact steps for the user to get a public link |
