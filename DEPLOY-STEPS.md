# Deploy steps — get a public link for Sardar And Malik Store

The store is built and tested. It is **not live yet** because deploying needs
an account on a hosting service, and no hosting account is connected. All
steps below are **free and need no credit card**. Nothing here asks for a
password or a card.

## What the user has to do (about 15 minutes)

### Step 1 — Make a free Render account (the host)

1. Open https://render.com and click **Get Started**.
2. Sign up with an email address (or "Sign up with GitHub" if you have one).
   No credit card is asked for.
3. Confirm the email Render sends you.

### Step 2 — Make a free Neon account (the database, so orders are never lost)

Render's free database deletes itself after 30 days, so the store uses Neon
instead — its free Postgres has no expiry date.

1. Open https://neon.tech and click **Sign Up Free**.
2. Sign up with an email address. No credit card is asked for.
3. Create a project (any name, e.g. `sardar-store`), then open it.
4. On the project dashboard, find **Connection string** and copy it. It
   looks like:
   `postgresql://neondb_owner:xxxx@ep-....aws.neon.tech/neondb?sslmode=require`
   Keep this private — it is the key to the store's database.

### Step 3 — Tell Muse "Render aur Neon account ban gaya"

Send Muse these two things:

1. The **Neon connection string** from Step 2 (paste it in chat, or send it
   through the secure-entry card if one is offered — never post it publicly).
2. The **panel password** you want for the public store (the same one you
   already use for the Owner Panel is fine — send it the same way).

Then Muse will: put this ready-made app on Render, set `DATABASE_URL` to
your Neon string and `PANEL_PASSWORD` to your password, deploy it, open the
public link, and test it end to end (register, order, panel). The public
link will look like `https://sardar-and-malik-store.onrender.com`.

### Step 4 — Share the link

Send the public link to customers (WhatsApp, Facebook, TikTok). Anyone who
opens it can register, browse the 298 products, and order. Orders arrive in
your Owner Panel (footer → Owner Login → your panel password).

## What is already prepared (nothing left to build)

The folder `~/workspace/sardar-and-malik-store-deploy/` contains the complete
app, already tested locally:

- `server.js` — backend + API (products, auth, orders, tracking, returns, panel)
- `public/` — the full storefront (Markaz-style layout)
- `data/products.json` — all 298 products, prices = Markaz + 750 PKR
- `data/reviews.json` — 1,337 gender-matched starter reviews
- `render.yaml` — Render free web service definition
- `.env.example` — the two secrets to set (`PANEL_PASSWORD`, `DATABASE_URL`)

Local test result: server starts, homepage loads, registration, login, order
placement, panel login, order status change, and return request all verified
with `curl` against the local server (see README for the exact commands).

## Free-tier limits to know about (honest)

- Render free web services **sleep after 15 minutes with no visitors** and
  take about a minute to wake on the next visit. The first visitor after a
  quiet spell waits ~1 minute.
- Neon free Postgres **scales to zero after ~5 minutes idle** and wakes on
  the next query (a few seconds). It does not expire.
- If the shop grows and you later pay, the first paid step is Render's
  $7/month web service (stays awake) — nothing forces you to pay.

## Alternative, if you prefer Vercel

Vercel can also host it, but only after you connect your own free Vercel
account in Muse, and Vercel's free Hobby plan is for personal,
non-commercial use only — a shop that sells products is commercial, so
Hobby's terms do not cover it (Pro is $20/month). That is why Render is
recommended for this store.
