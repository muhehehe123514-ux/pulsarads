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

/* ============================================================
   🔊 TTS NEURAL — proxy do serviço de voz do Edge (grátis)
   O navegador não consegue falar com esse serviço (ele exige
   headers de extensão do Edge), então o backend faz a ponte e
   devolve MP3. Funciona em Chrome, Edge, celular — qualquer um.
   ============================================================ */
const WebSocketTTS = require("ws");

const TTS_VOICES = new Set([
  // pt nativas
  "pt-BR-FranciscaNeural", "pt-BR-ThalitaNeural", "pt-BR-ThalitaMultilingualNeural",
  "pt-BR-AntonioNeural", "pt-PT-RaquelNeural", "pt-PT-DuarteNeural",
  // multilíngues premium (falam português fluente) — todas testadas uma a uma
  "en-US-AvaMultilingualNeural", "en-US-EmmaMultilingualNeural",
  "fr-FR-VivienneMultilingualNeural", "de-DE-SeraphinaMultilingualNeural",
  "en-US-AndrewMultilingualNeural", "en-US-BrianMultilingualNeural",
  "fr-FR-RemyMultilingualNeural", "de-DE-FlorianMultilingualNeural",
]);
// o serviço rejeita versões antigas do Edge; tenta em ordem até uma passar
const TTS_EDGE_VERSIONS = ["132.0.2957.115", "135.0.3179.54", "138.0.3351.65"];
let ttsVerIdx = 0;
let ttsSkewMs = 0; // desvio de relógio corrigido pelo header Date num 403

function ttsGec() {
  // BigInt obrigatório: os ticks do Windows (1.7e16) estouram o inteiro seguro do JS
  const ticks = BigInt(Math.floor((Date.now() + ttsSkewMs) / 1000 + 11644473600));
  const rounded = ticks - (ticks % 300n);
  return crypto.createHash("sha256").update((rounded * 10000000n).toString() + "6A5AA1D4EAFF4E9FB37E23D68491D6F4").digest("hex").toUpperCase();
}

const ttsEscapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function ttsSynthesize(text, voice, rate, pitch, tryNum = 0) {
  return new Promise((resolve, reject) => {
    const ver = TTS_EDGE_VERSIONS[ttsVerIdx];
    const url = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1" +
      "?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4" +
      "&Sec-MS-GEC=" + ttsGec() + "&Sec-MS-GEC-Version=1-" + ver +
      "&ConnectionId=" + crypto.randomUUID().replace(/-/g, "");
    const ws = new WebSocketTTS(url, {
      headers: {
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver.split(".")[0]}.0.0.0 Safari/537.36 Edg/${ver}`,
      },
    });
    const chunks = [];
    const timer = setTimeout(() => { try { ws.terminate(); } catch {} reject(new Error("timeout")); }, 30000);

    ws.on("open", () => {
      const ts = new Date(Date.now() + ttsSkewMs).toString();
      ws.send("X-Timestamp:" + ts + "\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n" +
        '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}');
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='pt-BR'>` +
        `<voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='+0%'>${ttsEscapeXml(text)}</prosody></voice></speak>`;
      ws.send("X-RequestId:" + crypto.randomUUID().replace(/-/g, "") + "\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:" + ts + "\r\nPath:ssml\r\n\r\n" + ssml);
    });
    ws.on("message", (data, isBinary) => {
      if (!isBinary) {
        if (data.toString().includes("Path:turn.end")) {
          clearTimeout(timer);
          ws.close();
          resolve(Buffer.concat(chunks));
        }
      } else {
        const hl = data.readUInt16BE(0);
        if (data.slice(2, 2 + hl).toString().includes("Path:audio")) chunks.push(data.slice(2 + hl));
      }
    });
    ws.on("unexpected-response", (rq, rs) => {
      clearTimeout(timer);
      rs.resume();
      if (tryNum < 4) {
        // corrige relógio e/ou tenta a próxima versão do Edge
        if (rs.headers.date) ttsSkewMs = new Date(rs.headers.date).getTime() - Date.now();
        if (rs.statusCode === 403 && tryNum >= 1) ttsVerIdx = (ttsVerIdx + 1) % TTS_EDGE_VERSIONS.length;
        return resolve(ttsSynthesize(text, voice, rate, pitch, tryNum + 1));
      }
      reject(new Error("HTTP " + rs.statusCode));
    });
    ws.on("error", (e) => { clearTimeout(timer); reject(e); });
  });
}

app.get("/api/health", (_req, res) => res.json({ ok: true, tts: true, ref: true, admin: true }));

/* ============================================================
   👑 ADMIN — usuários na nuvem + licença direta
   A senha do admin NUNCA está no código: só o hash PBKDF2 (o
   mesmo do login do site). Cada chamada envia a senha no header
   x-admin-pass e o servidor confere contra o hash.
   ============================================================ */
const ADMIN_PBKDF2 = "c8a28f0e30a29b364718af345a3ad2094af48b72ae4baf6ee703f7b83d00109b";
function adminOk(req) {
  const pass = String(req.headers["x-admin-pass"] || "");
  if (!pass) return false;
  const h = crypto.pbkdf2Sync(pass, "pulsar-salt-v1|" + ADMIN_USER, 100000, 32, "sha256").toString("hex");
  const a = Buffer.from(h), b = Buffer.from(ADMIN_PBKDF2);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function listUsers() {
  if (hasDB) {
    const keys = (await up(["KEYS", "pulsar:user:*"])) || [];
    const out = [];
    for (const k of keys.slice(0, 500)) {
      try {
        const s = await up(["GET", k]);
        if (!s) continue;
        const rec = JSON.parse(s);
        out.push({
          user: k.replace("pulsar:user:", ""),
          created: rec.created || null,
          plan: planActive(rec) ? rec.plan : "free",
          paidUntil: planActive(rec) ? rec.paidUntil : null,
        });
      } catch (_) {}
    }
    return out;
  }
  const d = loadFile();
  return Object.keys(d)
    .filter((k) => !k.startsWith("__tok_"))
    .map((name) => {
      const rec = d[name];
      return { user: name, created: rec.created || null, plan: planActive(rec) ? rec.plan : "free", paidUntil: planActive(rec) ? rec.paidUntil : null };
    });
}

app.get("/api/admin/users", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "senha de admin inválida" });
  try {
    const q = String(req.query.q || "").toLowerCase().trim();
    let users = await listUsers();
    if (q) users = users.filter((u) => u.user.includes(q));
    users.sort((a, b) => a.user.localeCompare(b.user));
    res.json({ users: users.slice(0, 200), total: users.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/grant", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "senha de admin inválida" });
  try {
    const user = String(req.body?.user || "").trim().toLowerCase();
    const plan = req.body?.plan === "max" ? "max" : "pro";
    const dur = req.body?.days;
    if (!user) return res.status(400).json({ error: "usuário vazio" });
    const rec = dur === "vida"
      ? await applyGrant(user, plan, { lifetime: true })
      : await applyGrant(user, plan, { days: Math.max(1, Math.min(3650, parseInt(dur, 10) || 30)) });
    res.json({ ok: true, user, plan: rec.plan, paidUntil: rec.paidUntil });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/revoke", async (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: "senha de admin inválida" });
  try {
    const user = String(req.body?.user || "").trim().toLowerCase();
    const rec = await getUser(user);
    if (!rec) return res.status(404).json({ error: "usuário não encontrado no servidor" });
    rec.plan = null;
    rec.paidUntil = null;
    rec.updated = new Date().toISOString();
    await putUser(user, rec);
    res.json({ ok: true, user, plan: "free" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================================================
   🖼️ REFERÊNCIA DE IMAGEM pro Criativo IA
   O gerador (Pollinations) só aceita referência por URL pública.
   O site envia a imagem em base64, guardamos NA MEMÓRIA por 30min
   e servimos numa URL — nada vai pra serviços de terceiros.
   ============================================================ */
const refStore = new Map(); // id → { buf, type, exp }
function pruneRefs() {
  const now = Date.now();
  for (const [id, r] of refStore) if (r.exp < now) refStore.delete(id);
  // trava de memória: mantém no máx. 40 imagens (~30 MB no pior caso)
  while (refStore.size > 40) refStore.delete(refStore.keys().next().value);
}

app.post("/api/upload-ref", express.json({ limit: "4mb" }), (req, res) => {
  try {
    const data = String(req.body?.data || "");
    const m = data.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
    if (!m) return res.status(400).json({ error: "envie { data: dataURL de imagem png/jpeg/webp }" });
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 2_500_000) return res.status(413).json({ error: "imagem grande demais (máx ~2,5 MB)" });
    pruneRefs();
    const id = crypto.randomBytes(9).toString("hex");
    refStore.set(id, { buf, type: m[1], exp: Date.now() + 30 * 60 * 1000 });
    const base = PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
    res.json({ url: `${base}/api/ref/${id}`, expiresInMin: 30 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/ref/:id", (req, res) => {
  const r = refStore.get(String(req.params.id).replace(/\.[a-z]+$/, ""));
  if (!r || r.exp < Date.now()) return res.status(404).json({ error: "referência expirou — envie de novo" });
  res.set({ "Content-Type": r.type, "Cache-Control": "public, max-age=1800" });
  res.send(r.buf);
});

app.get("/api/tts", async (req, res) => {
  try {
    const text = String(req.query.text || "").trim().slice(0, 1500);
    if (!text) return res.status(400).json({ error: "texto vazio" });
    const voice = TTS_VOICES.has(String(req.query.voice)) ? String(req.query.voice) : "pt-BR-FranciscaNeural";
    const rate = /^[+-]\d{1,2}%$/.test(String(req.query.rate)) ? String(req.query.rate) : "+0%";
    const pitch = /^[+-]\d{1,2}Hz$/.test(String(req.query.pitch)) ? String(req.query.pitch) : "+0Hz";
    const audio = await ttsSynthesize(text, voice, rate, pitch);
    if (!audio.length) return res.status(502).json({ error: "áudio vazio" });
    res.set({ "Content-Type": "audio/mpeg", "Cache-Control": "no-store" });
    res.send(audio);
  } catch (e) {
    console.error("tts", e.message);
    res.status(502).json({ error: "falha na síntese de voz: " + e.message });
  }
});

app.listen(PORT, () => console.log(`PulsarAds backend v3 on :${PORT} (MP ${client ? "ON" : "OFF"}, DB ${hasDB ? "Upstash" : "arquivo"})`));
