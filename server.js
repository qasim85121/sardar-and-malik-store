// Sardar And Malik Store — standalone server.
// Zero runtime dependencies for local use. Node.js 22+ only.
// Storage: local SQLite file (node:sqlite) by default; if DATABASE_URL is set
// (e.g. a free Neon/Supabase Postgres), it uses Postgres instead — the `pg`
// package is then required (declared in package.json; hosts install it).
// The Owner Panel password comes ONLY from the PANEL_PASSWORD environment
// variable. There is no default password and it is never written to any file.
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "data", "store.db");
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || "";
const EASYPAISA_JAZZCASH_NUMBER = "03169057378";
const EASYPAISA_JAZZCASH_NAME = "Qasim Tariq";
const ORDER_STATUSES = ["Received", "Confirmed", "Packed", "Shipped", "Delivered"];
const RETURN_STATUSES = ["Requested", "Approved", "Rejected"];

// ---------------------------------------------------------------------------
// Storage layer (SQLite file, or Postgres when DATABASE_URL is set)
// ---------------------------------------------------------------------------
let db = null; // { query(sql, params), run(sql, params), isPg }

function pgSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => "$" + (++i));
}

// Postgres folds unquoted identifiers to lowercase, so row keys come back
// lowercased (sardarprice). Map them back to the camelCase names the app uses.
const KEYMAP = {
  productid: "productId", reviewername: "reviewerName", reviewtext: "reviewText",
  markazprice: "markazPrice", sardarprice: "sardarPrice", reviewcount: "reviewCount",
  customerid: "customerId", passwordhash: "passwordHash", createdat: "createdAt",
  productname: "productName", customername: "customerName", paymentmethod: "paymentMethod",
  transactionid: "transactionId", orderid: "orderId"
};
function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) out[KEYMAP[k] || k] = v;
  return out;
}

async function initDb() {
  if (process.env.DATABASE_URL) {
    const { Client } = require("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    db = {
      isPg: true,
      query: async (sql, params = []) => (await client.query(pgSql(sql), params)).rows.map(normalizeRow),
      run: async (sql, params = []) => {
        const res = await client.query(pgSql(sql) + " RETURNING id", params);
        return { id: res.rows[0] ? res.rows[0].id : null };
      },
      exec: async (sql, params = []) => { await client.query(pgSql(sql), params); },
    };
  } else {
    const { DatabaseSync } = require("node:sqlite");
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    const sqlite = new DatabaseSync(DB_FILE);
    // This VM's overlay filesystem makes a full fsync per autocommit
    // transaction extremely slow (each one hangs for seconds). WAL + NORMAL
    // keeps writes fast; seeding below also runs in a single transaction.
    sqlite.exec("PRAGMA journal_mode=WAL");
    sqlite.exec("PRAGMA synchronous=NORMAL");
    db = {
      isPg: false,
      query: (sql, params = []) => sqlite.prepare(sql).all(...params),
      run: (sql, params = []) => {
        const info = sqlite.prepare(sql).run(...params);
        return { id: Number(info.lastInsertRowid) };
      },
      exec: (sql, params = []) => { sqlite.prepare(sql).run(...params); },
    };
  }
}

const ID = () => (db.isPg ? "SERIAL PRIMARY KEY" : "INTEGER PRIMARY KEY");
const DDL = () => [
  `CREATE TABLE IF NOT EXISTS products (
     id ${ID()}, name TEXT NOT NULL, category TEXT NOT NULL,
     description TEXT NOT NULL DEFAULT '', emoji TEXT NOT NULL DEFAULT '🛍️',
     image TEXT NOT NULL DEFAULT '',
     markazPrice INTEGER NOT NULL, sardarPrice INTEGER NOT NULL,
     rating REAL NOT NULL DEFAULT 4.8, reviewCount INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS reviews (
     id ${ID()}, productId INTEGER NOT NULL,
     reviewerName TEXT NOT NULL, city TEXT NOT NULL,
     rating INTEGER NOT NULL, reviewText TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS customers (
     id ${ID()}, name TEXT NOT NULL, contact TEXT NOT NULL UNIQUE,
     passwordHash TEXT NOT NULL, createdAt TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token TEXT PRIMARY KEY, customerId INTEGER, kind TEXT NOT NULL DEFAULT 'customer',
     createdAt TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS orders (
     id ${ID()}, customerId INTEGER NOT NULL, productId INTEGER NOT NULL,
     productName TEXT NOT NULL, customerName TEXT NOT NULL, phone TEXT NOT NULL,
     city TEXT NOT NULL, address TEXT NOT NULL, total INTEGER NOT NULL,
     paymentMethod TEXT NOT NULL DEFAULT 'cod', transactionId TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'Received', createdAt TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS returns (
     id ${ID()}, orderId INTEGER NOT NULL, customerId INTEGER NOT NULL,
     reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Requested',
     createdAt TEXT NOT NULL)`,
];

async function seedIfEmpty() {
  const n = await db.query("SELECT COUNT(*) AS c FROM products");
  if (Number(n[0].c) > 0) return;
  const products = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "products.json"), "utf8"));
  const reviews = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "reviews.json"), "utf8"));
  await db.query("BEGIN");
  try {
    for (const p of products) {
      await db.run(
        "INSERT INTO products (id,name,category,description,emoji,image,markazPrice,sardarPrice,rating,reviewCount) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [p.id, p.name, p.category, p.description, p.emoji, p.image || "", p.markazPrice, p.sardarPrice, p.rating, p.reviewCount]
      );
    }
    for (const r of reviews) {
      await db.run(
        "INSERT INTO reviews (id,productId,reviewerName,city,rating,reviewText) VALUES (?,?,?,?,?,?)",
        [r.id, r.productId, r.reviewerName, r.city, r.rating, r.reviewText]
      );
    }
    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }
  if (db.isPg) {
    // Explicit ids do not advance SERIAL sequences; reset them past the seed.
    await db.exec("SELECT setval(pg_get_serial_sequence('products','id'), (SELECT MAX(id) FROM products))");
    await db.exec("SELECT setval(pg_get_serial_sequence('reviews','id'), (SELECT MAX(id) FROM reviews))");
  }
  console.log(`Seeded ${products.length} products and ${reviews.length} reviews.`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return salt + ":" + hash;
}
function checkPassword(pw, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), crypto.scryptSync(pw, salt, 64));
}
function newToken() { return crypto.randomBytes(32).toString("hex"); }
function nowIso() { return new Date().toISOString(); }
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
    req.on("error", reject);
  });
}
async function authCustomer(req) {
  const t = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!t) return null;
  const rows = await db.query("SELECT customerId FROM sessions WHERE token=? AND kind='customer'", [t]);
  if (!rows.length) return null;
  const c = await db.query("SELECT id,name,contact FROM customers WHERE id=?", [rows[0].customerId]);
  return c[0] || null;
}
async function authPanel(req) {
  const t = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!t) return false;
  const rows = await db.query("SELECT token FROM sessions WHERE token=? AND kind='panel'", [t]);
  return rows.length > 0;
}
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
async function handleApi(req, res, pathname) {
  const body = req.method === "POST" ? await readBody(req) : {};
  const parts = pathname.split("/").filter(Boolean); // ["api", ...]

  // GET /api/products?category=&q=&page=&limit= (paginated: default 48/page)
  if (req.method === "GET" && parts.length === 2 && parts[1] === "products") {
    const url = new URL(req.url, "http://x");
    const category = url.searchParams.get("category") || "";
    const q = (url.searchParams.get("q") || "").toLowerCase();
    let products = await db.query("SELECT * FROM products ORDER BY id");
    const categories = [...new Set(products.map((p) => p.category))].sort();
    if (category) products = products.filter((p) => p.category === category);
    if (q) products = products.filter((p) => (p.name + " " + p.description + " " + p.category).toLowerCase().includes(q));
    const total = products.length;
    const perPage = Math.min(Math.max(Number(url.searchParams.get("limit")) || 48, 1), 200);
    const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
    const pages = Math.max(1, Math.ceil(total / perPage));
    const slice = products.slice((page - 1) * perPage, page * perPage);
    return sendJson(res, 200, { ok: true, total, page, pages, perPage, categories, products: slice });
  }

  // GET /api/products/:id
  if (req.method === "GET" && parts.length === 3 && parts[1] === "products") {
    const id = Number(parts[2]);
    const rows = await db.query("SELECT * FROM products WHERE id=?", [id]);
    if (!rows.length) return sendJson(res, 404, { ok: false, error: "Product not found" });
    const reviews = await db.query("SELECT * FROM reviews WHERE productId=? ORDER BY id", [id]);
    return sendJson(res, 200, { ok: true, product: rows[0], reviews });
  }

  // POST /api/auth/register
  if (req.method === "POST" && parts.join("/") === "api/auth/register") {
    const name = String(body.name || "").trim();
    const contact = String(body.contact || "").trim();
    const password = String(body.password || "");
    if (name.length < 2 || contact.length < 6 || password.length < 4)
      return sendJson(res, 400, { ok: false, error: "Naam, Gmail/phone number aur kam az kam 4 harf ka password zaroori hai." });
    const existing = await db.query("SELECT id FROM customers WHERE contact=?", [contact]);
    if (existing.length) return sendJson(res, 400, { ok: false, error: "Is Gmail/phone number se account pehle se bana hua hai. Login karein." });
    const r = await db.run("INSERT INTO customers (name,contact,passwordHash,createdAt) VALUES (?,?,?,?)",
      [name, contact, hashPassword(password), nowIso()]);
    const token = newToken();
    await db.exec("INSERT INTO sessions (token,customerId,kind,createdAt) VALUES (?,?, 'customer', ?)", [token, r.id, nowIso()]);
    return sendJson(res, 200, { ok: true, token, customer: { id: r.id, name, contact } });
  }

  // POST /api/auth/login
  if (req.method === "POST" && parts.join("/") === "api/auth/login") {
    const contact = String(body.contact || "").trim();
    const password = String(body.password || "");
    const rows = await db.query("SELECT * FROM customers WHERE contact=?", [contact]);
    if (!rows.length || !checkPassword(password, rows[0].passwordHash))
      return sendJson(res, 401, { ok: false, error: "Ghalat Gmail/phone number ya password." });
    const token = newToken();
    await db.exec("INSERT INTO sessions (token,customerId,kind,createdAt) VALUES (?,?, 'customer', ?)", [token, rows[0].id, nowIso()]);
    return sendJson(res, 200, { ok: true, token, customer: { id: rows[0].id, name: rows[0].name, contact } });
  }

  // GET /api/my/orders
  if (req.method === "GET" && parts.join("/") === "api/my/orders") {
    const c = await authCustomer(req);
    if (!c) return sendJson(res, 401, { ok: false, error: "Login zaroori hai." });
    const orders = await db.query("SELECT * FROM orders WHERE customerId=? ORDER BY id DESC", [c.id]);
    const ret = await db.query("SELECT * FROM returns WHERE customerId=? ORDER BY id DESC", [c.id]);
    return sendJson(res, 200, { ok: true, orders, returns: ret });
  }

  // POST /api/orders
  if (req.method === "POST" && parts.length === 2 && parts[1] === "orders") {
    const c = await authCustomer(req);
    if (!c) return sendJson(res, 401, { ok: false, error: "Order karne se pehle login karein." });
    const productId = Number(body.productId);
    const product = (await db.query("SELECT * FROM products WHERE id=?", [productId]))[0];
    if (!product) return sendJson(res, 400, { ok: false, error: "Product nahi mila." });
    const paymentMethod = ["cod", "easypaisa", "jazzcash"].includes(body.paymentMethod) ? body.paymentMethod : "cod";
    const transactionId = String(body.transactionId || "").trim();
    if (paymentMethod !== "cod" && !transactionId)
      return sendJson(res, 400, { ok: false, error: "Easypaisa/JazzCash ke liye transaction ID zaroori hai." });
    const customerName = String(body.customerName || c.name).trim();
    const phone = String(body.phone || "").trim();
    const city = String(body.city || "").trim();
    const address = String(body.address || "").trim();
    if (phone.length < 10 || city.length < 2 || address.length < 5)
      return sendJson(res, 400, { ok: false, error: "Phone number, sheher aur mukammal pata zaroori hai." });
    const r = await db.run(
      "INSERT INTO orders (customerId,productId,productName,customerName,phone,city,address,total,paymentMethod,transactionId,status,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,'Received',?)",
      [c.id, product.id, product.name, customerName, phone, city, address, product.sardarPrice, paymentMethod, transactionId, nowIso()]
    );
    return sendJson(res, 200, { ok: true, orderId: r.id, total: product.sardarPrice });
  }

  // POST /api/orders/:id/return
  if (req.method === "POST" && parts.length === 4 && parts[1] === "orders" && parts[3] === "return") {
    const c = await authCustomer(req);
    if (!c) return sendJson(res, 401, { ok: false, error: "Login zaroori hai." });
    const orderId = Number(parts[2]);
    const order = (await db.query("SELECT * FROM orders WHERE id=?", [orderId]))[0];
    if (!order) return sendJson(res, 404, { ok: false, error: "Order nahi mila." });
    if (order.customerId !== c.id) return sendJson(res, 403, { ok: false, error: "Ye aapka order nahi hai." });
    if (order.status !== "Delivered") return sendJson(res, 400, { ok: false, error: "Sirf delivered order return ho sakta hai." });
    const ageDays = (Date.now() - new Date(order.createdAt).getTime()) / 86400000;
    if (ageDays > 7) return sendJson(res, 400, { ok: false, error: "Return sirf 7 din ke andar hota hai." });
    const existing = await db.query("SELECT id FROM returns WHERE orderId=?", [orderId]);
    if (existing.length) return sendJson(res, 400, { ok: false, error: "Is order ki return request pehle se mojood hai." });
    const reason = String(body.reason || "Waja nahi batayi").trim().slice(0, 200);
    const r = await db.run("INSERT INTO returns (orderId,customerId,reason,status,createdAt) VALUES (?,?,?, 'Requested', ?)",
      [orderId, c.id, reason, nowIso()]);
    return sendJson(res, 200, { ok: true, returnId: r.id });
  }

  // GET /api/my/returns
  if (req.method === "GET" && parts.join("/") === "api/my/returns") {
    const c = await authCustomer(req);
    if (!c) return sendJson(res, 401, { ok: false, error: "Login zaroori hai." });
    const ret = await db.query("SELECT * FROM returns WHERE customerId=? ORDER BY id DESC", [c.id]);
    return sendJson(res, 200, { ok: true, returns: ret });
  }

  // POST /api/panel/verify
  if (req.method === "POST" && parts.join("/") === "api/panel/verify") {
    if (!PANEL_PASSWORD) return sendJson(res, 503, { ok: false, error: "Panel password host par set nahi hai." });
    if (String(body.password || "") !== PANEL_PASSWORD)
      return sendJson(res, 401, { ok: false, error: "Ghalat panel password." });
    const token = newToken();
    await db.exec("INSERT INTO sessions (token,customerId,kind,createdAt) VALUES (?, NULL, 'panel', ?)", [token, nowIso()]);
    return sendJson(res, 200, { ok: true, token });
  }

  // GET /api/panel/orders
  if (req.method === "GET" && parts.join("/") === "api/panel/orders") {
    if (!(await authPanel(req))) return sendJson(res, 401, { ok: false, error: "Panel login zaroori hai." });
    const orders = await db.query("SELECT * FROM orders ORDER BY id DESC");
    return sendJson(res, 200, { ok: true, orders });
  }

  // POST /api/panel/orders/:id/status
  if (req.method === "POST" && parts.length === 5 && parts[1] === "panel" && parts[2] === "orders" && parts[4] === "status") {
    if (!(await authPanel(req))) return sendJson(res, 401, { ok: false, error: "Panel login zaroori hai." });
    if (!ORDER_STATUSES.includes(body.status)) return sendJson(res, 400, { ok: false, error: "Ghalat status." });
    await db.run("UPDATE orders SET status=? WHERE id=?", [body.status, Number(parts[3])]);
    return sendJson(res, 200, { ok: true });
  }

  // GET /api/panel/returns
  if (req.method === "GET" && parts.join("/") === "api/panel/returns") {
    if (!(await authPanel(req))) return sendJson(res, 401, { ok: false, error: "Panel login zaroori hai." });
    const ret = await db.query("SELECT * FROM returns ORDER BY id DESC");
    return sendJson(res, 200, { ok: true, returns: ret });
  }

  // POST /api/panel/returns/:id/status
  if (req.method === "POST" && parts.length === 5 && parts[1] === "panel" && parts[2] === "returns" && parts[4] === "status") {
    if (!(await authPanel(req))) return sendJson(res, 401, { ok: false, error: "Panel login zaroori hai." });
    if (!RETURN_STATUSES.includes(body.status)) return sendJson(res, 400, { ok: false, error: "Ghalat status." });
    await db.run("UPDATE returns SET status=? WHERE id=?", [body.status, Number(parts[3])]);
    return sendJson(res, 200, { ok: true });
  }

  // POST /api/panel/products
  if (req.method === "POST" && parts.join("/") === "api/panel/products") {
    if (!(await authPanel(req))) return sendJson(res, 401, { ok: false, error: "Panel login zaroori hai." });
    const name = String(body.name || "").trim();
    const category = String(body.category || "Other").trim();
    const markazPrice = Number(body.markazPrice);
    if (name.length < 2 || !Number.isFinite(markazPrice) || markazPrice <= 0)
      return sendJson(res, 400, { ok: false, error: "Product ka naam aur sahi base price zaroori hai." });
    const sardarPrice = markazPrice + 750;
    const r = await db.run(
      "INSERT INTO products (name,category,description,emoji,markazPrice,sardarPrice,rating,reviewCount) VALUES (?,?,?,?,?,?,4.8,0)",
      [name, category, String(body.description || "").trim(), String(body.emoji || "🛍️"), markazPrice, sardarPrice]
    );
    return sendJson(res, 200, { ok: true, productId: r.id, sardarPrice });
  }

  // GET /api/config (public payment info shown at checkout)
  if (req.method === "GET" && parts.join("/") === "api/config") {
    return sendJson(res, 200, { ok: true, easypaisaJazzcashNumber: EASYPAISA_JAZZCASH_NUMBER, easypaisaJazzcashName: EASYPAISA_JAZZCASH_NAME });
  }

  return sendJson(res, 404, { ok: false, error: "Not found" });
}

// ---------------------------------------------------------------------------
// Static files + server
// ---------------------------------------------------------------------------
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, "http://x");
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith("/api/")) return handleApi(req, res, pathname);
    let file = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.join(__dirname, "public", file);
    if (!filePath.startsWith(path.join(__dirname, "public"))) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(fs.readFileSync(path.join(__dirname, "public", "index.html")));
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) sendJson(res, 500, { ok: false, error: "Server error" });
  }
}

const server = http.createServer(handleRequest);

async function boot() {
  await initDb();
  for (const sql of DDL()) await db.query(sql);
  // Migrate older databases that were created before the image column existed.
  try { await db.query("ALTER TABLE products ADD COLUMN image TEXT NOT NULL DEFAULT ''"); } catch { /* already there */ }
  await seedIfEmpty();
}
module.exports = { handleRequest, boot };

if (require.main === module) boot().then(() => {
  server.listen(PORT, HOST, () => {
    console.log(`Sardar And Malik Store running at http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
    if (!PANEL_PASSWORD) console.log("WARNING: PANEL_PASSWORD is not set — Owner Panel login is disabled.");
  });
}).catch((e) => { console.error("Failed to start:", e); process.exit(1); });
