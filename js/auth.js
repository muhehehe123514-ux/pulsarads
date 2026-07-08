/* ============================================================
   PulsarAds — Contas, plano Pro e paywall PIX
   Senhas nunca são guardadas em texto puro: PBKDF2(SHA-256,
   100k iterações) com salt por usuário. Tudo roda no navegador.
   ============================================================ */

"use strict";

const USERS_KEY = "pulsar_users";
const SESSION_KEY = "pulsar_session";
const SALT_PREFIX = "pulsar-salt-v1|";
const CODE_SECRET = "pulsar-pro-2026";

const ADMIN_USER = "logan";
// hash PBKDF2 da senha do admin (a senha em si não existe no código)
const ADMIN_HASH = "c8a28f0e30a29b364718af345a3ad2094af48b72ae4baf6ee703f7b83d00109b";

const PRICE = 40;
const PIX_KEY = "01562667254"; // CPF
const PIX_NAME = "LOGAN";
const PIX_CITY = "BRASILIA";

// ferramentas liberadas no plano gratuito
const FREE_TOOLS = ["contador", "estilizado", "utm", "radar"];

const loadUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
const saveUsers = (u) => localStorage.setItem(USERS_KEY, JSON.stringify(u));
const getSession = () => JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
const setSession = (s) => localStorage.setItem(SESSION_KEY, JSON.stringify(s));

// ---------- Crypto ----------
async function pbkdf2Hex(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
    key,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function proCode(user, yyyymm) {
  const h = await sha256Hex(`${CODE_SECRET}|${user.toLowerCase()}|${yyyymm}`);
  return (h.slice(0, 4) + "-" + h.slice(4, 8)).toUpperCase();
}

// ---------- PIX copia e cola (BR Code EMV) ----------
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function pixPayload() {
  const f = (id, v) => id + String(v.length).padStart(2, "0") + v;
  const payload =
    f("00", "01") +
    f("26", f("00", "br.gov.bcb.pix") + f("01", PIX_KEY)) +
    f("52", "0000") +
    f("53", "986") +
    f("54", PRICE.toFixed(2)) +
    f("58", "BR") +
    f("59", PIX_NAME) +
    f("60", PIX_CITY) +
    f("62", f("05", "PULSARPRO"));
  const withCrc = payload + "6304";
  return withCrc + crc16(withCrc);
}

// ---------- Sessão / plano ----------
function currentUser() {
  return getSession()?.user || null;
}
function isAdmin() {
  return currentUser() === ADMIN_USER;
}
const todayStr = () => new Date().toISOString().slice(0, 10);

function isPro() {
  if (isAdmin()) return true;
  const u = currentUser();
  if (!u) return false;
  const rec = loadUsers()[u];
  // acesso vale até o 30º dia; no dia seguinte (paidUntil) já bloqueia
  return !!(rec?.paidUntil && todayStr() < rec.paidUntil);
}

// ---------- Olhinho de senha ----------
const EYE_ON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

document.querySelectorAll(".pw-eye").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.eye);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.innerHTML = show ? EYE_OFF : EYE_ON;
    btn.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
    input.focus();
  });
});

// ---------- Tabs entrar/criar ----------
document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach((t) => t.classList.toggle("active", t === tab));
    $("#loginForm").hidden = tab.dataset.tab !== "login";
    $("#registerForm").hidden = tab.dataset.tab !== "register";
  });
});

// ---------- Cadastro ----------
$("#registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#regError");
  err.textContent = "";
  const user = $("#regUser").value.trim().toLowerCase();
  const pass = $("#regPass").value;
  const pass2 = $("#regPass2").value;
  if (!/^[a-z0-9_.-]{3,20}$/.test(user)) return (err.textContent = "Usuário: 3 a 20 caracteres (letras, números, _ . -).");
  if (user === ADMIN_USER) return (err.textContent = "Esse nome de usuário é reservado. Escolha outro.");
  const users = loadUsers();
  if (users[user]) return (err.textContent = "Já existe uma conta com esse nome. Escolha outro.");
  if (pass.length < 6) return (err.textContent = "A senha precisa ter pelo menos 6 caracteres.");
  if (pass !== pass2) return (err.textContent = "As senhas não conferem.");
  const hash = await pbkdf2Hex(pass, SALT_PREFIX + user);
  users[user] = { hash, created: new Date().toISOString().slice(0, 10), paidUntil: null };
  saveUsers(users);
  setSession({ user, ts: Date.now() });
  toast(`Conta criada! Bem-vindo(a), ${user} 🚀`);
  enterApp();
});

// ---------- Login ----------
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#loginError");
  err.textContent = "";
  const user = $("#loginUser").value.trim().toLowerCase();
  const pass = $("#loginPass").value;
  if (!user || !pass) return;
  const hash = await pbkdf2Hex(pass, SALT_PREFIX + user);
  if (user === ADMIN_USER) {
    if (hash === ADMIN_HASH) {
      setSession({ user, ts: Date.now() });
      toast("Bem-vindo de volta, chefe 👑");
      return enterApp();
    }
    return (err.textContent = "Senha incorreta.");
  }
  const rec = loadUsers()[user];
  if (!rec) return (err.textContent = "Conta não encontrada neste navegador. Crie uma conta grátis.");
  if (rec.hash !== hash) return (err.textContent = "Senha incorreta.");
  setSession({ user, ts: Date.now() });
  toast(`Bem-vindo(a) de volta, ${user} ⚡`);
  enterApp();
});

// ---------- Entrar / sair ----------
function enterApp() {
  document.body.classList.remove("auth-locked");
  $("#authScreen").hidden = true;
  renderUserChip();
  applyGating();
  if (isAdmin()) setupAdmin();
}

function logoutApp() {
  localStorage.removeItem(SESSION_KEY);
  location.reload();
}

function renderUserChip() {
  const bar = document.querySelector(".app-topbar");
  const old = bar.querySelector(".user-chip");
  if (old) old.remove();
  const chip = document.createElement("div");
  chip.className = "user-chip";
  chip.innerHTML = `<span class="uc-name">👤 ${escHtml(currentUser())}</span>
    <span class="uc-plan ${isPro() ? "pro" : ""}">${isAdmin() ? "👑 ADMIN" : isPro() ? "⚡ PRO" : "GRÁTIS"}</span>
    <button class="btn btn-ghost btn-sm" id="btnLogout">Sair</button>`;
  bar.insertBefore(chip, bar.querySelector(".topbar-back"));
  $("#btnLogout").addEventListener("click", logoutApp);
}

// ---------- Paywall / gating ----------
function paywallHtml() {
  return `<div class="lock-overlay">
    <div class="lock-card">
      <div class="lock-icon">🔒</div>
      <h3>Ferramenta <span class="grad-text">Pro</span></h3>
      <div class="lock-price">R$ ${PRICE},00<small>/mês</small></div>
      <p>Desbloqueie as 19 ferramentas, incluindo Meta Ads ao vivo (campanhas + funil), Biblioteca de Ofertas e Rastreador de Vendas automático.</p>
      <ol class="lock-steps">
        <li>Copie o PIX abaixo e pague <strong>R$ ${PRICE},00</strong> (chave CPF: ${PIX_KEY})</li>
        <li>Envie o comprovante + seu usuário (<strong>${escHtml(currentUser() || "")}</strong>) pro dono do site</li>
        <li>Receba seu código e ative aqui embaixo — libera 30 dias (renova a cada pagamento)</li>
      </ol>
      <div class="pix-row">
        <input type="text" readonly value="${pixPayload()}" onclick="this.select()" />
        <button class="btn btn-primary btn-sm" data-pix-copy>Copiar PIX 💠</button>
      </div>
      <div class="pix-row">
        <input type="text" placeholder="Código de ativação (XXXX-XXXX)" data-code-input maxlength="9" />
        <button class="btn btn-ghost btn-sm" data-code-activate>Ativar Pro 🔓</button>
      </div>
    </div>
  </div>`;
}

function applyGating() {
  const pro = isPro();
  // cadeados na sidebar
  document.querySelectorAll(".side-link").forEach((a) => {
    const tool = a.dataset.tool;
    if (tool === "admin") return;
    const locked = !pro && !FREE_TOOLS.includes(tool);
    let padlock = a.querySelector(".side-lock");
    if (locked && !padlock) {
      padlock = document.createElement("span");
      padlock.className = "side-lock";
      padlock.textContent = "🔒";
      a.appendChild(padlock);
    } else if (!locked && padlock) padlock.remove();
  });
  // overlay nos painéis premium
  document.querySelectorAll(".panel").forEach((p) => {
    const tool = p.id.replace("tool-", "");
    if (tool === "admin") return;
    const locked = !pro && !FREE_TOOLS.includes(tool);
    p.classList.toggle("locked", locked);
    const existing = p.querySelector(".lock-overlay");
    if (locked && !existing) p.insertAdjacentHTML("beforeend", paywallHtml());
    else if (!locked && existing) existing.remove();
  });
}

// copiar PIX / ativar código (delegado)
document.body.addEventListener("click", async (e) => {
  if (e.target.closest("[data-pix-copy]")) {
    copyText(pixPayload(), "PIX copia e cola copiado! 💠 Cole no app do seu banco");
  }
  const act = e.target.closest("[data-code-activate]");
  if (act) {
    const input = act.parentElement.querySelector("[data-code-input]");
    const code = (input.value || "").trim().toUpperCase();
    if (!code) return toast("Digite o código primeiro 🔑");
    const user = currentUser();
    const now = new Date();
    const months = [0, -1].map((off) => {
      const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    let ok = false;
    for (const ym of months) {
      if (code === (await proCode(user, ym))) { ok = true; break; }
    }
    if (!ok) return toast("Código inválido pra esse usuário/mês 😕");
    const users = loadUsers();
    if (!users[user]) users[user] = { hash: "", created: todayStr() };
    const until = new Date();
    until.setDate(until.getDate() + 30); // 30 dias de uso; no 31º já bloqueia
    users[user].paidUntil = until.toISOString().slice(0, 10);
    saveUsers(users);
    toast("⚡ PRO ativado por 30 dias! Bom jogo.");
    renderUserChip();
    applyGating();
  }
});

// ---------- Admin ----------
function setupAdmin() {
  $("#adminGroup").hidden = false;
  $("#adminLink").hidden = false;

  // meses no select (atual e próximo)
  const now = new Date();
  const opts = [0, 1].map((off) => {
    const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return `<option value="${ym}">${label}</option>`;
  });
  $("#admMonth").innerHTML = opts.join("");

  $("#btnAdmCode").addEventListener("click", async () => {
    const user = $("#admUser").value.trim().toLowerCase();
    if (!user) return toast("Digite o usuário do comprador 🔑");
    const code = await proCode(user, $("#admMonth").value);
    const out = $("#admCodeOut");
    out.hidden = false;
    out.innerHTML = `Código pra <strong>${escHtml(user)}</strong>: <strong style="color:var(--text);font-size:16px">${code}</strong>
      <button class="btn-copy" data-copy="${code}" style="margin-left:10px">Copiar</button>`;
  });

  renderAdminUsers();
}

function renderAdminUsers() {
  const users = loadUsers();
  const names = Object.keys(users);
  $("#admUsersTable tbody").innerHTML = names.length
    ? names
        .map((n) => {
          const u = users[n];
          const pro = u.paidUntil && todayStr() < u.paidUntil;
          return `<tr><td>${escHtml(n)}</td><td>${u.created || "—"}</td>
            <td>${pro ? '<span class="pill pill-on">⚡ Pro</span>' : '<span class="pill pill-off">grátis</span>'}</td>
            <td>${u.paidUntil ? u.paidUntil.split("-").reverse().join("/") : "—"}</td>
            <td><button class="btn-copy" data-adm-pro="${escHtml(n)}">+31d Pro</button></td>
            <td><button class="row-del" data-adm-del="${escHtml(n)}" title="Excluir conta">✕</button></td></tr>`;
        })
        .join("")
    : `<tr><td colspan="6" style="text-align:center;color:var(--muted)">Nenhuma conta criada neste navegador ainda.</td></tr>`;
}

$("#admUsersTable").addEventListener("click", (e) => {
  const give = e.target.closest("[data-adm-pro]");
  const del = e.target.closest("[data-adm-del]");
  const users = loadUsers();
  if (give) {
    const u = users[give.dataset.admPro];
    const base = u.paidUntil && todayStr() < u.paidUntil ? new Date(u.paidUntil) : new Date();
    base.setDate(base.getDate() + 30);
    u.paidUntil = base.toISOString().slice(0, 10);
    saveUsers(users);
    renderAdminUsers();
    toast("Pro estendido em 30 dias ⚡");
  }
  if (del) {
    if (!confirm(`Excluir a conta "${del.dataset.admDel}" deste navegador?`)) return;
    delete users[del.dataset.admDel];
    saveUsers(users);
    renderAdminUsers();
  }
});

// bloqueia o painel admin pra não-admin
window.addEventListener("hashchange", () => {
  if (location.hash === "#admin" && !isAdmin()) location.hash = "meta";
});

// expiração automática: re-checa o plano a cada troca de tela e a cada minuto,
// então no dia seguinte ao 30º o acesso cai sozinho, mesmo com a aba aberta
window.addEventListener("hashchange", () => {
  if (getSession()) { applyGating(); renderUserChip(); }
});
setInterval(() => {
  if (getSession()) { applyGating(); renderUserChip(); }
}, 60000);

// ---------- Boot ----------
if (getSession()) {
  enterApp();
} else {
  document.body.classList.add("auth-locked");
  $("#authScreen").hidden = false;
  if (location.hash === "#admin") location.hash = "";
}
