# Deploy steps — get a public link for Sardar And Malik Store

The store is built and tested. It is **not live yet** on a permanent link because deploying needs
an account on a hosting service, and no hosting account is connected.

> **Update 2026-11-13:** Render has started asking for a credit/debit card for identity
> verification even on the free plan (a temporary $1 USD authorization, refunded; the plan
> stays $0/month). The older line below saying "no credit card is asked for" is no longer
> true in practice — the deploy form was filled in full on 2026-11-13 and stopped at the
> Add Card dialog, so no Render service or deploy exists yet. If you have any debit/credit
> card (bank, JazzCash or Easypaisa debit card), add it yourself on Render's site — Muse
> never asks for card numbers — and the deploy can then finish in one step. If you have
> no card at all, see "Plan B if you have no card" at the bottom: the no-card options
> checked on 2026-11-13 (Railway, Fly.io, Koyeb) do not currently give a free permanent
> host, and Zeabur's free plan is unverified for this store, so do not promise it until
> tested. Until a permanent host is chosen, the store stays live on the temporary tunnel
> link, which Muse keeps alive and re-sends whenever it changes.

## What the user has to do (about 15 minutes)

### Step 1 — Make a free Render account (the host)

1. Open https://render.com and click **Get Started**.
2. Sign up with an email address (or "Sign up with GitHub" if you have one).
   **Since 2026-11-13 Render asks for a credit/debit card for identity verification even
   on the free plan** (temporary $1 USD authorization, refunded; plan stays $0/month).
   Add the card yourself on Render's site; Muse never asks for card numbers.
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

## Plan B if you have no card (checked 2026-11-13 — do not promise any of these until tested)

- **Railway:** signups reopened 2026-11-02 after the October security incident, but new
  customers must subscribe to a paid plan (Hobby/Pro) before deploying; free trial
  deployments remain temporarily unavailable. Not a no-card free host right now.
- **Fly.io:** new accounts get only a $1 trial for 7 days, no card to start; after that a
  card is required and machines stop. Not permanent.
- **Koyeb:** card required (about a $29 hold) and the free Starter tier is closed to new
  users after the Mistral acquisition. Not a no-card option.
- **Zeabur:** pricing pages checked Nov 2026 list a Free $0 plan with no card, but it is
  described as "1 manageable own server" with auto-sleep, and an Aug 2026 review says
  shared clusters are gone and a machine starts at about $10/month. Unverified whether
  its free plan really hosts this Node store for free — test it with the user's GitHub
  account before promising anything.

## Alternative, if you prefer Vercel

Vercel can also host it, but only after you connect your own free Vercel
account in Muse, and Vercel's free Hobby plan is for personal,
non-commercial use only — a shop that sells products is commercial, so
Hobby's terms do not cover it (Pro is $20/month). That is why Render is
recommended for this store.
