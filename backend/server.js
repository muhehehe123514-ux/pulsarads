/* ============================================================
   PulsarAds — Backend (contas + pagamentos)
   • Contas NO SERVIDOR (registro/login/sessão) num banco de dados,
     pra o cliente nunca perder o login nem o plano ao trocar de
     aparelho, limpar o navegador ou desligar o PC.
   • Pagamentos via Mercado Pago com liberação automática (webhook)
     e o próprio MP como fonte da verdade do plano.

   Variáveis de ambiente (Render → Environment):
     MP_ACCESS_TOKEN          Access Token de produção do Mercado Pago
     FRONTEND_ORIGIN          https://muhehehe123514-ux.github.io
     UPSTASH_REDIS_REST_URL   URL REST do banco (Upstash Redis, grátis)
     UPSTASH_REDIS_REST_TOKEN token REST do Upstash
     (PUBLIC_URL resolve sozinho via RENDER_EXTERNAL_URL)
   ============================================================ */

"use strict";

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

const PORT = process.env.PORT || 3000;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN || "";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
const FRONT_APP = FRONTEND_ORIGIN === "*"
  ? "https://muhehehe123514-ux.github.io/pulsarads/app.html"
  : FRONTEND_ORIGIN.replace(/\/$/, "") + "/pulsarads/app.html";

const UP_URL = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const UP_TOK = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const hasDB = !!(UP_URL && UP_TOK);

const CODE_SECRET = "pulsar-pro-2026"; // mesmo segredo do cliente (código público)
const ADMIN_USER = "logan";
const PLANS = { pro: { title: "PulsarAds Pro (30 dias)", price: 40 }, max: { title: "PulsarAds Max (30 dias)", price: 130 } };
const GRANT_DAYS = 30;
const client = MP_TOKEN ? new MercadoPagoConfig({ accessToken: MP_TOKEN }) : null;
const today = () => new Date().toISOString().slice(0, 10);

// ============================================================
//  Camada de banco: Upstash Redis (REST) OU arquivo local (fallback)
// ============================================================
async function up(cmd) {
  const r = await fetch(UP_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${UP_TOK}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error("DB HTTP " + r.status);
  return (await r.json()).result;
}
const FILE = path.join(__dirname, "grants.json");
const loadFile = () => { try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; } };
const saveFile = (d) => { try { fs.writeFileSync(FILE, JSON.stringify(d)); } catch (e) { console.error("saveFile", e.message); } };

async function getUser(name) {
  if (hasDB) { const s = await up(["GET", `pulsar:user:${name}`]); return s ? JSON.parse(s) : null; }
  return loadFile()[name] || null;
}
async function putUser(name, rec) {
  if (hasDB) { await up(["SET", `pulsar:user:${name}`, JSON.stringify(rec)]); return; }
  const d = loadFile(); d[name] = rec; saveFile(d);
}
async function setToken(tok, name) {
  if (hasDB) { await up(["SET", `pulsar:tok:${tok}`, name]); return; }
  const d = loadFile(); d[`__tok_${tok}`] = name; saveFile(d);
}
async function getTokenUser(tok) {
  if (hasDB) return await up(["GET", `pulsar:tok:${tok}`]);
  return loadFile()[`__tok_${tok}`] || null;
}

// ---------- senha (scrypt) ----------
function makeHash(pass) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pass, salt, 32).toString("hex");
  return { salt, hash };
}
function checkHash(pass, rec) {
  if (!rec || !rec.salt || !rec.hash) return false;
  const h = crypto.scryptSync(pass, rec.salt, 32).toString("hex");
  const a = Buffer.from(h), b = Buffer.from(rec.hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const newToken = () => crypto.randomBytes(24).toString("hex");
const sha8 = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 8).toUpperCase();

// ---------- plano ----------
async function applyGrant(name, plan, opts = {}) {
  const rec = (await getUser(name)) || { created: today() };
  if (opts.lifetime) { rec.plan = plan; rec.paidUntil = "vida"; }
  else {
    const active = rec.paidUntil && rec.paidUntil !== "vida" && new Date(rec.paidUntil) > new Date();
    const base = opts.fromDate ? new Date(opts.fromDate) : (active ? new Date(rec.paidUntil) : new Date());
    base.setDate(base.getDate() + (opts.days || GRANT_DAYS));
    rec.plan = plan; rec.paidUntil = base.toISOString().slice(0, 10);
  }
  rec.updated = new Date().toISOString();
  await putUser(name, rec);
  console.log(`[grant] ${name} -> ${plan} até ${rec.paidUntil}`);
  return rec;
}
function planActive(rec) {
  return rec && rec.plan && rec.paidUntil && (rec.paidUntil === "vida" || new Date(rec.paidUntil) >= new Date());
}

// FONTE DA VERDADE do pagamento: pergunta ao próprio Mercado Pago
async function mpLatestApproved(user) {
  if (!MP_TOKEN) return null;
  let best = null;
  for (const plan of ["pro", "max"]) {
    const ref = `${user}|${plan}`;
    const url = `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(ref)}&status=approved&sort=date_approved&criteria=desc&limit=1`;
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${MP_TOKEN}` } });
      if (!r.ok) continue;
      const d = await r.json();
      const p = d.results && d.results[0];
      if (p && p.date_approved) { const when = new Date(p.date_approved); if (!best || when > best.when) best = { plan, when }; }
    } catch (e) { console.error("mp search", e.message); }
  }
  return best;
}
// plano efetivo: banco → senão confirma no Mercado Pago e reidrata
async function effectivePlan(name) {
  const rec = await getUser(name);
  if (planActive(rec)) return { plan: rec.plan, paidUntil: rec.paidUntil };
  const found = await mpLatestApproved(name);
  if (found) { const g = await applyGrant(name, found.plan, { fromDate: found.when }); if (planActive(g)) return { plan: g.plan, paidUntil: g.paidUntil }; }
  return { plan: "free", paidUntil: null };
}

// ============================================================
const app = express();
// reflete qualquer origem (o site pode estar no GitHub Pages, Netlify, domínio próprio…)
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/", (_req, res) => res.json({ ok: true, service: "pulsarads-backend", version: 4, mp: !!client, db: hasDB ? "upstash" : "file", durable: true, multiDomain: true }));

const validUser = (u) => /^[a-z0-9_.-]{3,20}$/.test(u);

// ---------- Contas ----------
app.post("/api/register", async (req, res) => {
  try {
    const user = String(req.body.user || "").trim().toLowerCase();
    const pass = String(req.body.pass || "");
    if (!validUser(user)) return res.status(400).json({ error: "Usuário: 3 a 20 caracteres (letras, números, _ . -)." });
    if (user === ADMIN_USER) return res.status(400).json({ error: "Esse nome de usuário é reservado." });
    if (pass.length < 6) return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });
    if (await getUser(user)) return res.status(409).json({ error: "Já existe uma conta com esse nome. Faça login." });
    const { salt, hash } = makeHash(pass);
    await putUser(user, { salt, hash, created: today(), plan: null, paidUntil: null });
    const tok = newToken(); await setToken(tok, user);
    res.json({ ok: true, user, plan: "free", paidUntil: null, token: tok });
  } catch (e) { console.error("register", e.message); res.status(500).json({ error: "Servidor indisponível — tente de novo." }); }
});

app.post("/api/login", async (req, res) => {
  try {
    const user = String(req.body.user || "").trim().toLowerCase();
    const pass = String(req.body.pass || "");
    const rec = await getUser(user);
    if (!rec) return res.status(404).json({ error: "Conta não encontrada. Crie sua conta grátis." });
    if (!checkHash(pass, rec)) return res.status(401).json({ error: "Senha incorreta." });
    const { plan, paidUntil } = await effectivePlan(user);
    const tok = newToken(); await setToken(tok, user);
    res.json({ ok: true, user, plan, paidUntil, token: tok });
  } catch (e) { console.error("login", e.message); res.status(500).json({ error: "Servidor indisponível — tente de novo." }); }
});

app.post("/api/session", async (req, res) => {
  try {
    const tok = String(req.body.token || "");
    const user = tok ? await getTokenUser(tok) : null;
    if (!user) return res.status(401).json({ error: "sessão inválida" });
    const { plan, paidUntil } = await effectivePlan(user);
    res.json({ ok: true, user, plan, paidUntil });
  } catch (e) { console.error("session", e.message); res.status(500).json({ error: "erro" }); }
});

// ativação por código (cortesia/sorteio do admin) — validado no servidor e durável
app.post("/api/activate", async (req, res) => {
  try {
    const user = String(req.body.user || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!validUser(user)) return res.status(400).json({ error: "usuário inválido" });
    const now = new Date();
    const months = [0, -1].map((off) => { const d = new Date(now.getFullYear(), now.getMonth() + off, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
    const fmt = (h) => (h.slice(0, 4) + "-" + h.slice(4, 8)).toUpperCase();
    let plan = null, opts = null;
    const v2 = code.match(/^([0-9A-F]{4}-[0-9A-F]{4})-(P|M)(V|\d{1,3})$/);
    for (const ym of months) {
      if (v2) {
        const pl = v2[2] === "M" ? "max" : "pro", dur = v2[3];
        if (code === fmt(sha8(`${CODE_SECRET}|${user}|${pl}|${dur}|${ym}`)) + "-" + v2[2] + dur) { plan = pl; opts = dur === "V" ? { lifetime: true } : { days: parseInt(dur, 10) }; break; }
      } else if (/^[0-9A-F]{4}-[0-9A-F]{4}$/.test(code)) {
        if (code === fmt(sha8(`${CODE_SECRET}|${user}|${ym}`))) { plan = "pro"; opts = { days: 30 }; break; }
      }
    }
    if (!plan) return res.status(400).json({ error: "Código inválido pra esse usuário." });
    if (!(await getUser(user))) await putUser(user, { created: today() });
    const g = await applyGrant(user, plan, opts);
    res.json({ ok: true, user, plan: g.plan, paidUntil: g.paidUntil });
  } catch (e) { console.error("activate", e.message); res.status(500).json({ error: "erro" }); }
});

// ---------- Pagamento (Mercado Pago) ----------
app.post("/api/create-preference", async (req, res) => {
  try {
    if (!client) return res.status(500).json({ error: "MP_ACCESS_TOKEN não configurado no servidor." });
    const user = String(req.body.user || "").trim().toLowerCase();
    const plan = req.body.plan === "max" ? "max" : "pro";
    if (!validUser(user)) return res.status(400).json({ error: "usuário inválido" });
    const p = PLANS[plan];
    // volta pro domínio de onde o cliente veio (GitHub Pages, Netlify, etc.)
    const back = /^https?:\/\//.test(req.body.back || "") ? req.body.back.split("#")[0] : FRONT_APP;
    const result = await new Preference(client).create({
      body: {
        items: [{ title: p.title, quantity: 1, currency_id: "BRL", unit_price: p.price }],
        external_reference: `${user}|${plan}`,
        payment_methods: { installments: 1 },
        back_urls: { success: `${back}#pago`, pending: `${back}#pendente`, failure: `${back}#falhou` },
        auto_return: "approved",
        notification_url: PUBLIC_URL ? `${PUBLIC_URL}/api/webhook` : undefined,
      },
    });
    res.json({ id: result.id, init_point: result.init_point });
  } catch (e) { console.error("create-preference", e.message); res.status(500).json({ error: e.message }); }
});

app.post("/api/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    if (!client) return;
    const type = req.query.type || req.body.type;
    const id = req.query["data.id"] || req.body?.data?.id;
    if (type !== "payment" || !id) return;
    const payment = await new Payment(client).get({ id });
    if (payment.status === "approved" && payment.external_reference) {
      const [user, plan] = String(payment.external_reference).split("|");
      if (user) await applyGrant(user, plan === "max" ? "max" : "pro", { fromDate: payment.date_approved });
    }
  } catch (e) { console.error("webhook", e.message); }
});

app.get("/api/status", async (req, res) => {
  const user = String(req.query.user || "").trim().toLowerCase();
  if (!user) return res.json({ plan: "free", paidUntil: null });
  res.json(await effectivePlan(user));
});

app.listen(PORT, () => console.log(`PulsarAds backend v3 on :${PORT} (MP ${client ? "ON" : "OFF"}, DB ${hasDB ? "Upstash" : "arquivo"})`));
