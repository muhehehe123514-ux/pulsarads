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
const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
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

function grant(user, plan) {
  const db = loadDB();
  const until = new Date();
  const base = db[user]?.paidUntil && new Date(db[user].paidUntil) > new Date() ? new Date(db[user].paidUntil) : new Date();
  base.setDate(base.getDate() + GRANT_DAYS);
  db[user] = { plan, paidUntil: base.toISOString().slice(0, 10), updated: new Date().toISOString() };
  saveDB(db);
  console.log(`[grant] ${user} -> ${plan} até ${db[user].paidUntil}`);
}

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN }));
app.use(express.json());

app.get("/", (_req, res) => res.json({ ok: true, service: "pulsarads-backend", mp: !!client }));

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
      if (user) grant(user, plan === "max" ? "max" : "pro");
    }
  } catch (e) {
    console.error("webhook", e.message);
  }
});

// o app consulta aqui pra saber se já foi liberado
app.get("/api/status", (req, res) => {
  const user = String(req.query.user || "").trim().toLowerCase();
  const db = loadDB();
  const rec = db[user];
  if (rec && new Date(rec.paidUntil) >= new Date()) return res.json({ plan: rec.plan, paidUntil: rec.paidUntil });
  res.json({ plan: "free", paidUntil: null });
});

app.listen(PORT, () => console.log(`PulsarAds backend on :${PORT} (MP ${client ? "ON" : "OFF"})`));
