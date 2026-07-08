/* ============================================================
   PulsarAds — Backend de pagamentos (Mercado Pago)
   Libera o plano do cliente AUTOMATICAMENTE quando o pagamento
   é aprovado (via webhook do Mercado Pago). Sem gerar código à mão.

   Variáveis de ambiente (defina no Render → Environment):
     MP_ACCESS_TOKEN  = seu Access Token do Mercado Pago (produção)
     FRONTEND_ORIGIN  = https://muhehehe123514-ux.github.io  (ou seu domínio)
     PUBLIC_URL       = https://SEU-SERVICO.onrender.com     (URL deste backend)
   ============================================================ */

"use strict";

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

const PORT = process.env.PORT || 3000;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN || "";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
// no Render, RENDER_EXTERNAL_URL já vem preenchido automaticamente
const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
const FRONT_APP = FRONTEND_ORIGIN === "*"
  ? "https://muhehehe123514-ux.github.io/pulsarads/app.html"
  : FRONTEND_ORIGIN.replace(/\/$/, "") + "/pulsarads/app.html";

// planos e preços (R$)
const PLANS = { pro: { title: "PulsarAds Pro (30 dias)", price: 40 }, max: { title: "PulsarAds Max (30 dias)", price: 130 } };
const GRANT_DAYS = 30;

const client = MP_TOKEN ? new MercadoPagoConfig({ accessToken: MP_TOKEN }) : null;

// ---------- "banco" simples em arquivo (grants por usuário) ----------
// Obs.: no plano free do Render o disco é efêmero (reseta em deploy/restart).
// Como o próprio navegador do cliente também guarda o plano ao confirmar,
// isso é suficiente nesta escala. Pra produção robusta, troque por um DB.
const DB = path.join(__dirname, "grants.json");
const loadDB = () => { try { return JSON.parse(fs.readFileSync(DB, "utf8")); } catch { return {}; } };
const saveDB = (d) => { try { fs.writeFileSync(DB, JSON.stringify(d)); } catch (e) { console.error("saveDB", e.message); } };

function grant(user, plan, fromDate) {
  const db = loadDB();
  const base = fromDate
    ? new Date(fromDate)
    : (db[user]?.paidUntil && new Date(db[user].paidUntil) > new Date() ? new Date(db[user].paidUntil) : new Date());
  base.setDate(base.getDate() + GRANT_DAYS);
  db[user] = { plan, paidUntil: base.toISOString().slice(0, 10), updated: new Date().toISOString() };
  saveDB(db);
  console.log(`[grant] ${user} -> ${plan} até ${db[user].paidUntil}`);
  return db[user];
}

// FONTE DA VERDADE: pergunta ao próprio Mercado Pago se há pagamento aprovado
// pra esse usuário. Assim o plano NUNCA se perde, mesmo se o disco resetar.
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
      if (p && p.date_approved) {
        const when = new Date(p.date_approved);
        if (!best || when > best.when) best = { plan, when };
      }
    } catch (e) { console.error("mp search", e.message); }
  }
  return best; // { plan, when } ou null
}

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN }));
app.use(express.json());

app.get("/", (_req, res) => res.json({ ok: true, service: "pulsarads-backend", version: 2, mp: !!client, durable: true }));

// cria a preferência de pagamento e devolve o link do checkout
app.post("/api/create-preference", async (req, res) => {
  try {
    if (!client) return res.status(500).json({ error: "MP_ACCESS_TOKEN não configurado no servidor." });
    const user = String(req.body.user || "").trim().toLowerCase();
    const plan = req.body.plan === "max" ? "max" : "pro";
    if (!/^[a-z0-9_.-]{3,20}$/.test(user)) return res.status(400).json({ error: "usuário inválido" });
    const p = PLANS[plan];
    const pref = new Preference(client);
    const result = await pref.create({
      body: {
        items: [{ title: p.title, quantity: 1, currency_id: "BRL", unit_price: p.price }],
        external_reference: `${user}|${plan}`,
        payment_methods: { installments: 1 },
        back_urls: {
          success: `${FRONT_APP}#pago`,
          pending: `${FRONT_APP}#pendente`,
          failure: `${FRONT_APP}#falhou`,
        },
        auto_return: "approved",
        notification_url: PUBLIC_URL ? `${PUBLIC_URL}/api/webhook` : undefined,
      },
    });
    res.json({ id: result.id, init_point: result.init_point });
  } catch (e) {
    console.error("create-preference", e.message);
    res.status(500).json({ error: e.message });
  }
});

// webhook do Mercado Pago: chega quando o status do pagamento muda
app.post("/api/webhook", async (req, res) => {
  res.sendStatus(200); // responde rápido; processa depois
  try {
    if (!client) return;
    const type = req.query.type || req.body.type;
    const id = req.query["data.id"] || req.body?.data?.id;
    if (type !== "payment" || !id) return;
    const payment = await new Payment(client).get({ id });
    if (payment.status === "approved" && payment.external_reference) {
      const [user, plan] = String(payment.external_reference).split("|");
      if (user) grant(user, plan === "max" ? "max" : "pro", payment.date_approved);
    }
  } catch (e) {
    console.error("webhook", e.message);
  }
});

// o app consulta aqui pra saber se já foi liberado.
// 1) tenta o cache local (rápido); 2) se não achar, PERGUNTA AO MERCADO PAGO
//    (fonte da verdade) e recria o registro — assim o plano nunca se perde.
app.get("/api/status", async (req, res) => {
  const user = String(req.query.user || "").trim().toLowerCase();
  if (!user) return res.json({ plan: "free", paidUntil: null });

  const db = loadDB();
  const rec = db[user];
  if (rec && new Date(rec.paidUntil) >= new Date()) {
    return res.json({ plan: rec.plan, paidUntil: rec.paidUntil, source: "cache" });
  }

  // não tem no cache (ou expirou): confirma direto no Mercado Pago
  const found = await mpLatestApproved(user);
  if (found) {
    const g = grant(user, found.plan, found.when); // reidrata o cache a partir do pagamento real
    if (new Date(g.paidUntil) >= new Date()) {
      return res.json({ plan: g.plan, paidUntil: g.paidUntil, source: "mercadopago" });
    }
  }
  res.json({ plan: "free", paidUntil: null });
});

app.listen(PORT, () => console.log(`PulsarAds backend on :${PORT} (MP ${client ? "ON" : "OFF"})`));
