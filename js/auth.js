/* ============================================================
   PulsarAds — Contas, planos (Grátis / Pro / Max) e paywall PIX
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

const PIX_KEY = "01562667254"; // CPF
const PIX_NAME = "LOGAN";
const PIX_CITY = "BRASILIA";

// planos pagos — o Grátis libera quase tudo, mas com poucos tokens
// e sem o Explorador de Ofertas
const PLAN_INFO = {
  pro: { label: "Pro", emoji: "⚡", price: 40,  ref: "PULSARPRO",
         bullets: ["Todas as 21 ferramentas", "🔥 Explorador + 📚 Biblioteca + ✨ Modelar", "140 usos · recarrega a cada 4h"] },
  max: { label: "Max", emoji: "🚀", price: 130, ref: "PULSARMAX",
         bullets: ["Tudo do Pro", "Usos ILIMITADOS", "Sem espera de recarga", "Prioridade nas novidades"] },
};

// ferramentas trancadas no plano gratuito (abrem no Pro/Max)
const FREE_LOCKED = ["ofertas", "biblioteca", "modelar"];

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

// código legado (XXXX-XXXX): Pro 30 dias
async function proCode(user, yyyymm) {
  const h = await sha256Hex(`${CODE_SECRET}|${user.toLowerCase()}|${yyyymm}`);
  return (h.slice(0, 4) + "-" + h.slice(4, 8)).toUpperCase();
}

// código v2 (XXXX-XXXX-P30 / M90 / PV…): plano + duração embutidos.
// dur = nº de dias ou "V" (vitalício)
async function planCode(user, plan, dur, yyyymm) {
  const h = await sha256Hex(`${CODE_SECRET}|${user.toLowerCase()}|${plan}|${dur}|${yyyymm}`);
  const suf = (plan === "max" ? "M" : "P") + dur;
  return (h.slice(0, 4) + "-" + h.slice(4, 8)).toUpperCase() + "-" + suf;
}

// ---------- PIX copia e cola + QR (BR Code EMV) ----------
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

function pixPayload(price, ref) {
  const f = (id, v) => id + String(v.length).padStart(2, "0") + v;
  const payload =
    f("00", "01") +
    f("26", f("00", "br.gov.bcb.pix") + f("01", PIX_KEY)) +
    f("52", "0000") +
    f("53", "986") +
    f("54", price.toFixed(2)) +
    f("58", "BR") +
    f("59", PIX_NAME) +
    f("60", PIX_CITY) +
    f("62", f("05", ref));
  const withCrc = payload + "6304";
  return withCrc + crc16(withCrc);
}

// desenha o QR do PIX dentro de todos os [data-pix-qr] do container
function renderPixQrs(root) {
  if (typeof qrcode !== "function") return; // CDN ainda não carregou
  (root || document).querySelectorAll("[data-pix-qr]").forEach((el) => {
    if (el.dataset.done) return;
    try {
      const qr = qrcode(0, "M");
      qr.addData(el.dataset.pixQr);
      qr.make();
      el.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      el.dataset.done = "1";
    } catch (_) { /* payload grande demais pro tipo — não acontece com PIX */ }
  });
}

// ---------- Sessão / plano ----------
function currentUser() {
  return getSession()?.user || null;
}
function isAdmin() {
  return currentUser() === ADMIN_USER;
}
const todayStr = () => new Date().toISOString().slice(0, 10);

// migração: contas antigas tinham só paidUntil (= Pro)
function migrateUsers() {
  const users = loadUsers();
  let dirty = false;
  for (const u of Object.values(users)) {
    if (u.paidUntil && !u.plan) { u.plan = "pro"; dirty = true; }
  }
  if (dirty) saveUsers(users);
}

// "free" | "pro" | "max" — admin conta como max vitalício
function planOf() {
  if (isAdmin()) return "max";
  const u = currentUser();
  if (!u) return "free";
  const rec = loadUsers()[u];
  if (!rec?.plan || !rec.paidUntil) return "free";
  // acesso vale até o último dia pago; no dia seguinte já bloqueia
  if (rec.paidUntil === "vida" || todayStr() < rec.paidUntil) return rec.plan;
  return "free";
}
function isPro() {
  return planOf() !== "free";
}
window.planOf = planOf;
window.pulsarIsAdmin = isAdmin;

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
  if (users[user]) return (err.textContent = "Já existe uma conta com esse nome neste navegador — use a aba Entrar.");
  if (pass.length < 6) return (err.textContent = "A senha precisa ter pelo menos 6 caracteres.");
  if (pass !== pass2) return (err.textContent = "As senhas não conferem.");
  const hash = await pbkdf2Hex(pass, SALT_PREFIX + user);
  users[user] = { hash, created: new Date().toISOString().slice(0, 10), plan: null, paidUntil: null };
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
  if (!rec) return (err.textContent = "Conta não encontrada NESTE navegador. As contas ficam salvas no aparelho/navegador onde foram criadas — entre pelo mesmo, ou crie de novo aqui.");
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
  if (window.renderTokenMeter) window.renderTokenMeter();
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
  const plan = planOf();
  const badge = isAdmin() ? "👑 ADMIN" : plan === "max" ? "🚀 MAX" : plan === "pro" ? "⚡ PRO" : "GRÁTIS";
  const chip = document.createElement("div");
  chip.className = "user-chip";
  chip.innerHTML = `<span class="uc-name">👤 ${escHtml(currentUser())}</span>
    <span class="uc-plan ${plan !== "free" ? "pro" : ""}" id="ucPlanBadge" title="Ver planos" style="cursor:pointer">${badge}</span>
    <button class="btn btn-ghost btn-sm" id="btnLogout">Sair</button>`;
  bar.insertBefore(chip, bar.querySelector(".topbar-back"));
  $("#btnLogout").addEventListener("click", logoutApp);
  $("#ucPlanBadge").addEventListener("click", () => showPlansModal());
}

// ---------- Paywall / gating ----------
function planCardsHtml() {
  return `<div class="plan-cards">
    ${Object.entries(PLAN_INFO).map(([key, p]) => {
      const payload = pixPayload(p.price, p.ref);
      return `<div class="plan-card ${key}">
        <div class="pc-head"><span class="pc-name">${p.emoji} ${p.label}</span>
          <span class="pc-price">R$ ${p.price},00<small>/mês</small></span></div>
        <ul class="pc-bullets">${p.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
        ${window.PULSAR_BACKEND ? `<button class="btn btn-primary btn-sm pc-mp" data-mp-pay="${key}">💳 Pagar com Mercado Pago (libera na hora)</button>` : ""}
        <div class="pix-qr" data-pix-qr="${payload}" aria-label="QR Code PIX do plano ${p.label}"></div>
        <div class="pix-row">
          <input type="text" readonly value="${payload}" onclick="this.select()" />
          <button class="btn btn-ghost btn-sm" data-pix-copy="${key}">Copiar PIX 💠</button>
        </div>
      </div>`;
    }).join("")}
  </div>
  <div class="pix-row" style="margin-top:14px">
    <input type="text" placeholder="Código de ativação (XXXX-XXXX-…)" data-code-input maxlength="16" />
    <button class="btn btn-ghost btn-sm" data-code-activate>Ativar 🔓</button>
  </div>
  <p class="hint" style="margin-top:8px">${window.PULSAR_BACKEND
    ? "💳 Mercado Pago libera automaticamente assim que o pagamento é aprovado. Prefere PIX manual? Escaneie o QR / copie o código e ative aqui embaixo."
    : "Escaneie o QR (ou copie o PIX) no app do seu banco → após a confirmação do pagamento seu código de ativação é liberado → cole aqui e pronto."} Chave PIX: CPF ${PIX_KEY}.</p>`;
}

function paywallHtml() {
  return `<div class="lock-overlay">
    <div class="lock-card lock-card-wide">
      <div class="lock-icon">🔒</div>
      <h3>Ferramenta <span class="grad-text">Pro</span></h3>
      <p>O 🔥 Explorador de Ofertas, a 📚 Biblioteca de Ofertas e o ✨ Modelar Oferta são exclusivos dos planos pagos. Escolha o seu:</p>
      ${planCardsHtml()}
    </div>
  </div>`;
}

// modal de planos (aberto pelo medidor de tokens, pelo chip do usuário
// ou quando os tokens acabam)
function showPlansModal(reasonHtml) {
  let m = $("#plansModal");
  if (m) m.remove();
  m = document.createElement("div");
  m.className = "modal-backdrop";
  m.id = "plansModal";
  m.innerHTML = `<div class="modal lock-card-wide" role="dialog" aria-label="Planos">
    <h3 style="margin:0 0 6px">Planos <span class="grad-text">PulsarAds</span></h3>
    ${reasonHtml ? `<p class="tk-reason">${reasonHtml}</p>` : `<p style="color:var(--text-2);margin:0 0 4px">Desbloqueie tudo e turbine seus tokens:</p>`}
    ${planCardsHtml()}
    <div class="form-actions" style="justify-content:flex-end;margin-top:12px">
      <button class="btn btn-ghost btn-sm" data-close-plans>Fechar</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  renderPixQrs(m);
  m.addEventListener("click", (e) => {
    if (e.target === m || e.target.closest("[data-close-plans]")) m.remove();
  });
}
window.showPlansModal = showPlansModal;

function applyGating() {
  const unlocked = planOf() !== "free";
  // cadeados na sidebar
  document.querySelectorAll(".side-link").forEach((a) => {
    const tool = a.dataset.tool;
    if (tool === "admin") return;
    const locked = !unlocked && FREE_LOCKED.includes(tool);
    let padlock = a.querySelector(".side-lock");
    if (locked && !padlock) {
      padlock = document.createElement("span");
      padlock.className = "side-lock";
      padlock.textContent = "🔒";
      a.appendChild(padlock);
    } else if (!locked && padlock) padlock.remove();
  });
  // overlay nos painéis exclusivos
  document.querySelectorAll(".panel").forEach((p) => {
    const tool = p.id.replace("tool-", "");
    if (tool === "admin") return;
    const locked = !unlocked && FREE_LOCKED.includes(tool);
    p.classList.toggle("locked", locked);
    const existing = p.querySelector(".lock-overlay");
    if (locked && !existing) {
      p.insertAdjacentHTML("beforeend", paywallHtml());
      renderPixQrs(p);
    } else if (!locked && existing) existing.remove();
  });
}

// copiar PIX / ativar código (delegado)
document.body.addEventListener("click", async (e) => {
  const cp = e.target.closest("[data-pix-copy]");
  if (cp) {
    const plan = PLAN_INFO[cp.dataset.pixCopy] || PLAN_INFO.pro;
    copyText(pixPayload(plan.price, plan.ref), `PIX do plano ${plan.label} copiado! 💠 Cole no app do seu banco`);
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

    let plan = null, dur = null, ok = false;
    const v2 = code.match(/^([0-9A-F]{4}-[0-9A-F]{4})-(P|M)(V|\d{1,3})$/);
    if (v2) {
      plan = v2[2] === "M" ? "max" : "pro";
      dur = v2[3];
      for (const ym of months) {
        if (code === (await planCode(user, plan, dur, ym))) { ok = true; break; }
      }
    } else if (/^[0-9A-F]{4}-[0-9A-F]{4}$/.test(code)) {
      // código legado = Pro 30 dias
      plan = "pro"; dur = "30";
      for (const ym of months) {
        if (code === (await proCode(user, ym))) { ok = true; break; }
      }
    }
    if (!ok) return toast("Código inválido pra esse usuário 😕");

    const users = loadUsers();
    if (!users[user]) users[user] = { hash: "", created: todayStr() };
    users[user].plan = plan;
    if (dur === "V") {
      users[user].paidUntil = "vida";
    } else {
      const until = new Date();
      until.setDate(until.getDate() + parseInt(dur, 10));
      users[user].paidUntil = until.toISOString().slice(0, 10);
    }
    saveUsers(users);
    const p = PLAN_INFO[plan];
    toast(`${p.emoji} Plano ${p.label} ativado ${dur === "V" ? "PRA SEMPRE 👑" : `por ${dur} dias!`} Bom jogo.`);
    $("#plansModal")?.remove();
    renderUserChip();
    applyGating();
    if (window.renderTokenMeter) window.renderTokenMeter();
  }
});

// ---------- Admin ----------
const DUR_LABEL = { 1: "1 dia", 3: "3 dias", 7: "7 dias", 15: "15 dias", 30: "30 dias", 90: "90 dias", 180: "180 dias", 365: "1 ano", V: "♾️ Vitalício" };

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
  $("#admDur").innerHTML = Object.entries(DUR_LABEL).map(([v, l]) => `<option value="${v}"${v === "30" ? " selected" : ""}>${l}</option>`).join("");

  $("#btnAdmCode").addEventListener("click", async () => {
    const user = $("#admUser").value.trim().toLowerCase();
    if (!user) return toast("Digite o usuário do comprador 🔑");
    const plan = $("#admPlan").value;
    const dur = $("#admDur").value;
    const code = await planCode(user, plan, dur, $("#admMonth").value);
    const out = $("#admCodeOut");
    out.hidden = false;
    out.innerHTML = `Código <strong>${PLAN_INFO[plan].emoji} ${PLAN_INFO[plan].label} · ${DUR_LABEL[dur]}</strong> pra <strong>${escHtml(user)}</strong>:
      <strong style="color:var(--text);font-size:16px">${code}</strong>
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
          const active = u.plan && u.paidUntil && (u.paidUntil === "vida" || todayStr() < u.paidUntil);
          const pill = !active
            ? '<span class="pill pill-off">grátis</span>'
            : u.plan === "max"
              ? '<span class="pill pill-on">🚀 Max</span>'
              : '<span class="pill pill-on">⚡ Pro</span>';
          const until = !u.paidUntil ? "—" : u.paidUntil === "vida" ? "♾️ vitalício" : u.paidUntil.split("-").reverse().join("/");
          return `<tr><td>${escHtml(n)}</td><td>${u.created || "—"}</td>
            <td>${pill}</td><td>${until}</td>
            <td><button class="btn-copy" data-adm-give="pro|${escHtml(n)}" title="Dar/estender Pro 30 dias">⚡+30d</button>
                <button class="btn-copy" data-adm-give="max|${escHtml(n)}" title="Dar/estender Max 30 dias">🚀+30d</button>
                <button class="btn-copy" data-adm-give="vida|${escHtml(n)}" title="Max vitalício">♾️</button></td>
            <td>${active ? `<button class="row-del" data-adm-revoke="${escHtml(n)}" title="Revogar o plano agora">⛔</button>` : ""}
                <button class="row-del" data-adm-del="${escHtml(n)}" title="Excluir conta">✕</button></td></tr>`;
        })
        .join("")
    : `<tr><td colspan="6" style="text-align:center;color:var(--muted)">Nenhuma conta criada neste navegador ainda.</td></tr>`;
}

$("#admUsersTable").addEventListener("click", (e) => {
  const give = e.target.closest("[data-adm-give]");
  const revoke = e.target.closest("[data-adm-revoke]");
  const del = e.target.closest("[data-adm-del]");
  const users = loadUsers();
  if (give) {
    const [what, name] = give.dataset.admGive.split("|");
    const u = users[name];
    if (what === "vida") {
      u.plan = "max";
      u.paidUntil = "vida";
      toast(`♾️ ${name} agora é Max vitalício 👑`);
    } else {
      const base = u.paidUntil && u.paidUntil !== "vida" && todayStr() < u.paidUntil ? new Date(u.paidUntil) : new Date();
      base.setDate(base.getDate() + 30);
      u.plan = what;
      u.paidUntil = base.toISOString().slice(0, 10);
      toast(`${PLAN_INFO[what].emoji} ${PLAN_INFO[what].label} de ${name} estendido em 30 dias`);
    }
    saveUsers(users);
    renderAdminUsers();
  }
  if (revoke) {
    const name = revoke.dataset.admRevoke;
    if (!confirm(`Revogar o plano de "${name}" agora? A conta volta pro grátis.`)) return;
    users[name].plan = null;
    users[name].paidUntil = null;
    saveUsers(users);
    renderAdminUsers();
    toast(`⛔ Plano de ${name} revogado`);
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
// então no dia seguinte ao último dia pago o acesso cai sozinho, mesmo com a aba aberta
window.addEventListener("hashchange", () => {
  if (getSession()) { applyGating(); renderUserChip(); }
});
setInterval(() => {
  if (getSession()) { applyGating(); renderUserChip(); if (window.renderTokenMeter) window.renderTokenMeter(); }
}, 60000);

// ---------- Boot ----------
migrateUsers();
if (getSession()) {
  enterApp();
} else {
  document.body.classList.add("auth-locked");
  $("#authScreen").hidden = false;
  if (location.hash === "#admin") location.hash = "";
}
