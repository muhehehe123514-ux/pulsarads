/* ============================================================
   PulsarAds — Limite de USOS das ferramentas
   Não é cobrança por token: cada vez que você usa uma função
   conta como 1 uso. A conta grátis tem ~15 usos e a Pro ~70,
   e o contador recarrega sozinho a cada 5 horas. Max é ilimitado.
   Tudo por navegador/usuário.
   ============================================================ */

"use strict";

const USE_KEY = "pulsar_tokens"; // { [user]: { left, resetAt } }
const RESET_MS = 5 * 60 * 60 * 1000; // recarrega a cada 5h
// quantos usos das ferramentas cada plano tem por janela de 5h
const USE_CAP = { free: 15, pro: 70, max: Infinity };

// botões que contam como "1 uso" ao serem acionados
const PREMIUM_BTNS = new Set([
  "btnHeadlines", "btnRewrite", "btnFrameworks", "btnBlocked",
  "btnCrDownload", "btnCrVideo",
  "btnOcrRun",
  "btnMdIdeas", "btnMdPage",
  "btnLtGenerate",
  "btnOpGenerate",
  "btnTtsPlay",
]);

const loadUses = () => JSON.parse(localStorage.getItem(USE_KEY) || "{}");
const saveUses = (o) => localStorage.setItem(USE_KEY, JSON.stringify(o));

function useState() {
  const plan = typeof planOf === "function" ? planOf() : "free";
  if (plan === "max") return { plan, unlimited: true };
  const cap = USE_CAP[plan] || USE_CAP.free;
  const user = (typeof currentUser === "function" && currentUser()) || "anon";
  const all = loadUses();
  const now = Date.now();
  let s = all[user];
  if (!s) s = { left: cap, resetAt: now + RESET_MS };
  if (now >= s.resetAt) { s.left = cap; s.resetAt = now + RESET_MS; } // recarga automática
  if (s.left > cap) s.left = cap; // trocou de plano pra um menor
  all[user] = s;
  saveUses(all);
  return { plan, unlimited: false, left: s.left, cap, resetAt: s.resetAt, user };
}

function resetText(ts) {
  const ms = Math.max(0, ts - Date.now());
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `em ${h}h ${String(m).padStart(2, "0")}min`;
  if (m > 0) return `em ${m}min`;
  return "em instantes";
}

// cobra 1 uso; retorna true se pôde usar, false (e mostra planos) se acabou
function chargeTokens(n = 1, label) {
  const st = useState();
  if (st.unlimited) return true;
  if (st.left < n) {
    if (typeof showPlansModal === "function") {
      showPlansModal(
        `🪫 Você atingiu o limite de usos do seu plano (${st.cap} a cada 5h). ` +
        `Ele recarrega sozinho <strong>${resetText(st.resetAt)}</strong>.` +
        ` Quer usar sem esperar? O plano <strong>🚀 Max é ilimitado</strong>.`
      );
    } else if (typeof toast === "function") {
      toast("Limite de usos atingido — recarrega " + resetText(st.resetAt));
    }
    renderTokenMeter();
    return false;
  }
  const all = loadUses();
  all[st.user].left = st.left - n;
  saveUses(all);
  renderTokenMeter();
  return true;
}
window.chargeTokens = chargeTokens;
window.tokenState = useState;

// ---------- medidor na sidebar ----------
function renderTokenMeter() {
  const el = document.getElementById("tokenMeter");
  if (!el) return;
  if (typeof getSession === "function" && !getSession()) { el.hidden = true; return; }
  const st = useState();
  el.hidden = false;
  if (st.unlimited) {
    el.className = "token-meter unlimited";
    el.innerHTML = `<div class="tm-top"><span>🚀 Usos</span><strong>ILIMITADO</strong></div>
      <div class="tm-note">${st.plan === "max" ? "Plano Max — sem limites 💜" : "Acesso total 👑"}</div>`;
    return;
  }
  const pct = Math.round((st.left / st.cap) * 100);
  const low = pct <= 25;
  el.className = "token-meter" + (low ? " low" : "");
  const planName = st.plan === "pro" ? "⚡ Pro" : "🆓 Grátis";
  el.innerHTML = `<div class="tm-top"><span>🎟️ Usos · ${planName}</span><strong>${st.left}/${st.cap}</strong></div>
    <div class="tm-bar"><span style="width:${pct}%"></span></div>
    <div class="tm-note">${st.left < st.cap ? `Recarrega ${resetText(st.resetAt)}` : "Cheio ✅"} · a cada 5h${st.plan !== "max" ? ` · <a href="#" data-open-plans>turbinar ⚡</a>` : ""}</div>`;
}
window.renderTokenMeter = renderTokenMeter;

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-open-plans]")) {
    e.preventDefault();
    if (typeof showPlansModal === "function") showPlansModal();
  }
});

// intercepta os botões premium ANTES do handler real (fase de captura):
// se o limite de usos acabou, bloqueia a ação e abre os planos
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn || !PREMIUM_BTNS.has(btn.id)) return;
  if (!chargeTokens(1, btn.id)) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);

// atualiza a contagem regressiva a cada 30s
setInterval(() => { if (!document.getElementById("tokenMeter")?.hidden) renderTokenMeter(); }, 30000);

// primeira renderização (a sessão já foi restaurada pelo auth.js)
renderTokenMeter();
