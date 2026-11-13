// Sardar And Malik Store — storefront logic (vanilla JS, no framework).
"use strict";
const $ = (s) => document.querySelector(s);
const STATUSES = ["Received", "Confirmed", "Packed", "Shipped", "Delivered"];
const RETURN_REASONS = ["Ghalat product aaya", "Product kharab / toota hua", "Size ya colour ghalat", "Quality achi nahi", "Mujhe ab nahi chahiye"];

let state = { products: [], categories: [], category: "", q: "", detail: null, page: 1, pages: 1, loading: false };
let session = JSON.parse(localStorage.getItem("sms_session") || "null"); // {token, customer}
let panelToken = sessionStorage.getItem("sms_panel") || "";
let payInfo = { number: "", name: "" };

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 3500);
}
async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = "Bearer " + opts.token;
  const res = await fetch(path, { method: opts.method || "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ("Request failed (" + res.status + ")"));
  return data;
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pkr = (n) => "PKR " + Number(n).toLocaleString("en-PK");

// ---------- catalogue ----------
function mediaHtml(p, kind) {
  const wrapCls = kind === "detail" ? "detail-media" : "card-media";
  const emojiCls = kind === "detail" ? "detail-emoji" : "card-emoji";
  if (!p.image) return `<div class="${wrapCls}"><div class="${emojiCls}">${esc(p.emoji || "🛍️")}</div></div>`;
  const src = p.image.startsWith("http") ? p.image : "/" + String(p.image).replace(/^\//, "");
  return `<div class="${wrapCls}"><img src="${esc(src)}" alt="${esc(p.name)}" loading="lazy" onerror="if(!this.dataset.retried){this.dataset.retried='1';var i=this;setTimeout(function(){i.src=i.src.split('?')[0]+'?retry=1';},700);}else{this.remove();}"></div>`;
}
async function loadProducts(append = false) {
  if (state.loading) return;
  state.loading = true;
  const params = new URLSearchParams();
  if (state.category) params.set("category", state.category);
  if (state.q) params.set("q", state.q);
  params.set("page", append ? state.page + 1 : 1);
  params.set("limit", 48);
  try {
    const data = await api("/api/products?" + params.toString());
    state.page = data.page;
    state.pages = data.pages;
    state.products = append ? state.products.concat(data.products) : data.products;
    state.categories = data.categories;
    $("#productCount").textContent = data.total + " products";
    renderChips();
    renderGrid(data.products, append);
    $("#loadMoreBtn").classList.toggle("hidden", state.page >= state.pages);
  } finally {
    state.loading = false;
  }
}
function renderChips() {
  const wrap = $("#categoryChips");
  wrap.innerHTML = state.categories.map((c) =>
    `<button class="chip ${state.category === c ? "chip-active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  wrap.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => {
    state.category = b.dataset.cat;
    document.querySelectorAll(".subnav .chip").forEach((x) => x.classList.remove("chip-active"));
    b.classList.add("chip-active");
    document.querySelector('.subnav [data-cat=""]').classList.remove("chip-active");
    loadProducts();
  }));
  document.querySelector('.subnav [data-cat=""]').classList.toggle("chip-active", !state.category);
}
function cardHtml(p) {
  const stars = "★".repeat(Math.round(p.rating)) + "☆".repeat(5 - Math.round(p.rating));
  return `<article class="card">
    ${mediaHtml(p, "card")}
    <div class="card-body">
      <span class="card-cat">${esc(p.category)}</span>
      <span class="card-name">${esc(p.name)}</span>
      <span class="stars">${stars} ${p.rating} (${p.reviewCount} reviews)</span>
      <span class="price-old">${pkr(p.sardarPrice + 350)}</span>
      <span class="price">${pkr(p.sardarPrice)}</span>
      <span class="badge">+750 included • COD</span>
      <div class="card-actions">
        <button class="btn btn-dark" data-order="${p.id}">Order Karein</button>
        <button class="btn btn-link" data-view="${p.id}">🔗 Link</button>
      </div>
    </div>
  </article>`;
}
function renderGrid(newItems, append = false) {
  const grid = $("#productGrid");
  if (append) {
    grid.insertAdjacentHTML("beforeend", newItems.map(cardHtml).join(""));
  } else {
    grid.innerHTML = state.products.map(cardHtml).join("");
  }
  $("#emptyMsg").classList.toggle("hidden", state.products.length > 0);
}
// One delegated listener for all cards (works for appended pages too).
$("#productGrid").addEventListener("click", (e) => {
  const orderBtn = e.target.closest("[data-order]");
  if (orderBtn) { openOrder(Number(orderBtn.dataset.order)); return; }
  const viewBtn = e.target.closest("[data-view]");
  if (viewBtn) { location.hash = "#product-" + viewBtn.dataset.view; }
});
$("#loadMoreBtn").addEventListener("click", () => loadProducts(true));

// ---------- product detail ----------
async function showProduct(id) {
  showView("product");
  $("#productDetail").innerHTML = "<p>Loading...</p>";
  const data = await api("/api/products/" + id);
  const p = data.product;
  const stars = "★".repeat(Math.round(p.rating)) + "☆".repeat(5 - Math.round(p.rating));
  $("#productDetail").innerHTML = `
    <div class="detail">
      ${mediaHtml(p, "detail")}
      <div>
        <span class="card-cat">${esc(p.category)}</span>
        <h2 style="margin:6px 0">${esc(p.name)}</h2>
        <p>${esc(p.description || "")}</p>
        <p><span class="stars">${stars} ${p.rating} (${p.reviewCount} reviews)</span></p>
        <p><span class="price-old">${pkr(p.sardarPrice + 350)}</span><br>
        <span class="price">${pkr(p.sardarPrice)}</span><br>
        <span class="badge">+750 included • COD</span></p>
        <p class="tiny">Base rate + 750 included • Cash on Delivery • 7-day returns</p>
        <button class="btn btn-orange" id="detailOrder">Order Karein</button>
        <button class="btn btn-link" id="detailLink">🔗 Copy Product Link</button>
        <h3 style="margin-top:22px">Customer Reviews (${data.reviews.length})</h3>
        ${data.reviews.map((r) => `<div class="review"><b>${esc(r.reviewerName)}</b> <span class="city">— ${esc(r.city)}</span> <span class="stars">${"★".repeat(r.rating)}</span><p>${esc(r.reviewText)}</p></div>`).join("") || "<p>No reviews yet.</p>"}
      </div>
    </div>`;
  $("#detailOrder").addEventListener("click", () => openOrder(p.id));
  $("#detailLink").addEventListener("click", () => {
    const url = location.origin + location.pathname + "#product-" + p.id;
    navigator.clipboard && navigator.clipboard.writeText(url);
    toast("Product link copy ho gaya: " + url);
  });
}

// ---------- views / routing ----------
function showView(name) {
  for (const v of ["home", "product", "orders", "panel"]) $("#view-" + v).classList.toggle("hidden", v !== name);
  $("#hero").classList.toggle("hidden", name !== "home");
  window.scrollTo(0, 0);
}
function route() {
  const h = location.hash || "#/";
  if (h.startsWith("#product-")) return showProduct(Number(h.slice(9)));
  if (h === "#/orders") return loadMyOrders();
  if (h === "#/panel") return showView("panel");
  showView("home");
}
$("#backBtn").addEventListener("click", () => { location.hash = "#/"; });
window.addEventListener("hashchange", route);

// ---------- search ----------
function doSearch() {
  state.q = $("#searchInput").value.trim();
  location.hash = "#/";
  loadProducts();
}
$("#searchBtn").addEventListener("click", doSearch);
$("#searchInput").addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
document.querySelector('.subnav [data-cat=""]').addEventListener("click", () => {
  state.category = "";
  document.querySelectorAll(".subnav .chip").forEach((x) => x.classList.remove("chip-active"));
  document.querySelector('.subnav [data-cat=""]').classList.add("chip-active");
  loadProducts();
});

// ---------- auth ----------
let authMode = "login";
function refreshAuthUI() {
  const logged = !!session;
  $("#userGreeting").classList.toggle("hidden", !logged);
  $("#myOrdersBtn").classList.toggle("hidden", !logged);
  $("#logoutBtn").classList.toggle("hidden", !logged);
  $("#authBtn").classList.toggle("hidden", logged);
  $("#registerBtn").classList.toggle("hidden", logged);
  if (logged) $("#userGreeting").textContent = "Assalam-o-Alaikum, " + session.customer.name;
}
function openAuth(mode) {
  authMode = mode;
  $("#authTitle").textContent = mode === "register" ? "Register" : "Login";
  $("#authSubmit").textContent = mode === "register" ? "Register" : "Login";
  $("#authName").classList.toggle("hidden", mode !== "register");
  $("#authSwitch").textContent = mode === "register" ? "Account hai? Login karein" : "New here? Register karein";
  $("#authError").classList.add("hidden");
  $("#authModal").classList.remove("hidden");
}
$("#authBtn").addEventListener("click", () => openAuth("login"));
$("#registerBtn").addEventListener("click", () => openAuth("register"));
$("#authSwitch").addEventListener("click", () => openAuth(authMode === "login" ? "register" : "login"));
$("#authClose").addEventListener("click", () => $("#authModal").classList.add("hidden"));
$("#logoutBtn").addEventListener("click", () => {
  session = null; localStorage.removeItem("sms_session");
  panelToken = ""; sessionStorage.removeItem("sms_panel");
  refreshAuthUI(); toast("Logout ho gaya."); location.hash = "#/";
});
$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await api("/api/auth/" + authMode, { method: "POST", body: {
      name: fd.get("name"), contact: fd.get("contact"), password: fd.get("password") } });
    session = { token: data.token, customer: data.customer };
    localStorage.setItem("sms_session", JSON.stringify(session));
    $("#authModal").classList.add("hidden");
    refreshAuthUI();
    toast(authMode === "register" ? "Account ban gaya. Khush amdeed!" : "Login ho gaya.");
  } catch (err) {
    const el = $("#authError");
    el.textContent = err.message; el.classList.remove("hidden");
  }
});

// ---------- ordering ----------
let orderProduct = null;
async function openOrder(productId) {
  orderProduct = state.products.find((p) => p.id === productId) ||
    (await api("/api/products/" + productId)).product;
  if (!session) { toast("Order karne se pehle login karein."); openAuth("login"); return; }
  $("#orderTitle").textContent = "Order Karein — " + orderProduct.name;
  $("#orderTotal").textContent = pkr(orderProduct.sardarPrice);
  $("#payNumber").textContent = payInfo.number;
  $("#payName").textContent = payInfo.name;
  $("#orderError").classList.add("hidden");
  $("#orderModal").classList.remove("hidden");
}
$("#orderClose").addEventListener("click", () => $("#orderModal").classList.add("hidden"));
document.querySelectorAll('input[name="paymentMethod"]').forEach((r) =>
  r.addEventListener("change", () => {
    const adv = document.querySelector('input[name="paymentMethod"]:checked').value !== "cod";
    $("#advanceBox").classList.toggle("hidden", !adv);
  }));
$("#orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await api("/api/orders", { method: "POST", token: session.token, body: {
      productId: orderProduct.id,
      customerName: fd.get("customerName"), phone: fd.get("phone"),
      city: fd.get("city"), address: fd.get("address"),
      paymentMethod: fd.get("paymentMethod"), transactionId: fd.get("transactionId") } });
    $("#orderModal").classList.add("hidden");
    toast("Order mil gaya! Order #" + data.orderId + ", Total " + pkr(data.total));
    location.hash = "#/orders";
  } catch (err) {
    const el = $("#orderError");
    el.textContent = err.message; el.classList.remove("hidden");
  }
});

// ---------- my orders ----------
$("#myOrdersBtn").addEventListener("click", () => { location.hash = "#/orders"; });
async function loadMyOrders() {
  showView("orders");
  if (!session) { $("#ordersList").innerHTML = "<p>Please login to see your orders.</p>"; $("#returnsList").innerHTML = ""; return; }
  const data = await api("/api/my/orders", { token: session.token });
  $("#ordersList").innerHTML = data.orders.length ? data.orders.map((o) => {
    const idx = STATUSES.indexOf(o.status);
    return `<div class="order-card">
      <h4>Order #${o.id} — ${esc(o.productName)}</h4>
      <p>Total: <strong>${pkr(o.total)}</strong> • ${o.paymentMethod === "cod" ? "Cash on Delivery" : esc(o.paymentMethod) + (o.transactionId ? " • Txn: " + esc(o.transactionId) : "")}<br>
      Address: ${esc(o.address)}, ${esc(o.city)} • ${esc(o.createdAt.slice(0, 10))}</p>
      <div class="tracker">${STATUSES.map((s, i) => `<span class="step ${i <= idx ? "done" : ""}">${s}</span>`).join("")}</div>
      ${o.status === "Delivered" ? `<button class="btn btn-dark btn-small" data-return="${o.id}">↩️ Return Request</button>` : ""}
    </div>`;
  }).join("") : "<p>Abhi koi order nahi hai.</p>";
  $("#returnsList").innerHTML = data.returns.length ? data.returns.map((r) =>
    `<div class="order-card"><b>Return #${r.id}</b> — Order #${r.orderId} • Reason: ${esc(r.reason)} • Status: <strong>${esc(r.status)}</strong></div>`).join("")
    : "<p>No return requests.</p>";
  document.querySelectorAll("[data-return]").forEach((b) => b.addEventListener("click", async () => {
    const reason = prompt("Return ki waja chunein:\n" + RETURN_REASONS.map((r, i) => (i + 1) + ". " + r).join("\n") + "\n\nNumber likhein (1-" + RETURN_REASONS.length + "):", "1");
    const n = Number(reason);
    if (!n || n < 1 || n > RETURN_REASONS.length) return;
    try {
      await api("/api/orders/" + b.dataset.return + "/return", { method: "POST", token: session.token, body: { reason: RETURN_REASONS[n - 1] } });
      toast("Return request bhej di gayi.");
      loadMyOrders();
    } catch (err) { toast(err.message); }
  }));
}

// ---------- owner panel ----------
$("#ownerLoginLink").addEventListener("click", () => { $("#panelError").classList.add("hidden"); $("#panelModal").classList.remove("hidden"); });
$("#panelClose").addEventListener("click", () => $("#panelModal").classList.add("hidden"));
$("#panelForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await api("/api/panel/verify", { method: "POST", body: { password: fd.get("password") } });
    panelToken = data.token;
    sessionStorage.setItem("sms_panel", panelToken);
    $("#panelModal").classList.add("hidden");
    location.hash = "#/panel";
    loadPanel();
  } catch (err) {
    const el = $("#panelError");
    el.textContent = err.message; el.classList.remove("hidden");
  }
});
async function loadPanel() {
  showView("panel");
  if (!panelToken) { $("#panelOrders").innerHTML = "<p>Panel kholne ke liye Owner Login karein.</p>"; return; }
  try {
    const orders = await api("/api/panel/orders", { token: panelToken });
    $("#panelOrders").innerHTML = orders.orders.length ? orders.orders.map((o) => `
      <div class="panel-order">
        <b>Order #${o.id}</b> — ${esc(o.productName)} — ${pkr(o.total)}<br>
        ${esc(o.customerName)} • ${esc(o.phone)} • ${esc(o.address)}, ${esc(o.city)}<br>
        Payment: ${o.paymentMethod === "cod" ? "COD" : esc(o.paymentMethod) + " • Txn: " + esc(o.transactionId)}<br>
        Status: <select data-status="${o.id}">${STATUSES.map((s) => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select>
      </div>`).join("") : "<p>No orders yet.</p>";
    document.querySelectorAll("[data-status]").forEach((sel) => sel.addEventListener("change", async () => {
      await api("/api/panel/orders/" + sel.dataset.status + "/status", { method: "POST", token: panelToken, body: { status: sel.value } });
      toast("Order #" + sel.dataset.status + " status: " + sel.value);
    }));
    const rets = await api("/api/panel/returns", { token: panelToken });
    $("#panelReturns").innerHTML = rets.returns.length ? rets.returns.map((r) => `
      <div class="panel-order"><b>Return #${r.id}</b> — Order #${r.orderId} • ${esc(r.reason)} • Status: <strong>${esc(r.status)}</strong><br>
      ${r.status === "Requested" ? `<button class="btn btn-small btn-orange" data-ret-ok="${r.id}">Approve</button>
      <button class="btn btn-small btn-ghost" data-ret-no="${r.id}" style="color:#111">Reject</button>` : ""}</div>`).join("") : "<p>No return requests.</p>";
    document.querySelectorAll("[data-ret-ok]").forEach((b) => b.addEventListener("click", async () => {
      await api("/api/panel/returns/" + b.dataset.retOk + "/status", { method: "POST", token: panelToken, body: { status: "Approved" } });
      toast("Return approved."); loadPanel();
    }));
    document.querySelectorAll("[data-ret-no]").forEach((b) => b.addEventListener("click", async () => {
      await api("/api/panel/returns/" + b.dataset.retNo + "/status", { method: "POST", token: panelToken, body: { status: "Rejected" } });
      toast("Return rejected."); loadPanel();
    }));
  } catch (err) {
    panelToken = ""; sessionStorage.removeItem("sms_panel");
    $("#panelOrders").innerHTML = "<p>" + esc(err.message) + "</p>";
  }
}
$("#addProductForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await api("/api/panel/products", { method: "POST", token: panelToken, body: {
      name: fd.get("name"), category: fd.get("category"), description: fd.get("description"),
      markazPrice: Number(fd.get("markazPrice")) } });
    toast("Product add ho gaya. Selling price: " + pkr(data.sardarPrice));
    e.target.reset();
    loadProducts();
  } catch (err) { toast(err.message); }
});

// ---------- boot ----------
(async () => {
  try { payInfo = await api("/api/config"); } catch { /* payment info optional */ }
  refreshAuthUI();
  await loadProducts();
  route();
})();
