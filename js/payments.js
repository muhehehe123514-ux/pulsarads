/* ============================================================
   PulsarAds — Pagamento via Mercado Pago (liberação automática)
   Só entra em ação quando window.PULSAR_BACKEND (js/config.js)
   aponta pro backend publicado. Sem isso, o site segue no
   fluxo PIX + código de ativação normalmente.
   ============================================================ */

"use strict";

(function () {
  const backend = () => (window.PULSAR_BACKEND || "").replace(/\/$/, "");

  // clica em "Pagar com Mercado Pago" → cria a cobrança e redireciona pro checkout
  async function pulsarPay(plan) {
    const b = backend();
    const user = typeof currentUser === "function" ? currentUser() : null;
    if (!b) return toast("Pagamento automático ainda não configurado — use o PIX + código.");
    if (!user) return toast("Entre na sua conta primeiro.");
    try {
      toast("Abrindo o Mercado Pago… 💳");
      const r = await fetch(b + "/api/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, plan, back: location.href.split("#")[0] }),
      });
      const d = await r.json();
      if (d.init_point) {
        localStorage.setItem("pulsar_pending_plan", plan);
        location.href = d.init_point;
      } else {
        toast(d.error || "Não consegui iniciar o pagamento 😕");
      }
    } catch (_) {
      toast("Servidor de pagamento fora do ar — tente o PIX + código 😕");
    }
  }
  window.pulsarPay = pulsarPay;

  // consulta o backend e libera o plano localmente se o pagamento caiu
  async function pulsarCheckPayment(silent) {
    const b = backend();
    const user = typeof currentUser === "function" ? currentUser() : null;
    if (!b || !user) return false;
    try {
      const r = await fetch(b + "/api/status?user=" + encodeURIComponent(user));
      const d = await r.json();
      if (d.plan && d.plan !== "free" && d.paidUntil) {
        // com backend: guarda no cache de plano; sem backend: no store local
        if (typeof setPlanCache === "function" && (window.PULSAR_BACKEND || "")) {
          setPlanCache(user, d.plan, d.paidUntil);
        } else {
          const users = loadUsers();
          if (!users[user]) users[user] = { hash: "", created: new Date().toISOString().slice(0, 10) };
          users[user].plan = d.plan;
          users[user].paidUntil = d.paidUntil;
          saveUsers(users);
        }
        localStorage.removeItem("pulsar_pending_plan");
        document.getElementById("plansModal")?.remove();
        if (typeof applyGating === "function") applyGating();
        if (typeof renderUserChip === "function") renderUserChip();
        if (window.renderTokenMeter) window.renderTokenMeter();
        toast(`Pagamento confirmado ✅ Plano ${d.plan.toUpperCase()} liberado!`);
        return true;
      }
      if (!silent) toast("O pagamento ainda não caiu. Se já pagou, aguarde alguns segundos e verifique de novo.");
    } catch (_) {
      if (!silent) toast("Não consegui verificar o pagamento agora 😕");
    }
    return false;
  }
  window.pulsarCheckPayment = pulsarCheckPayment;

  // clique no botão de pagar (delegado — os cards são injetados dinamicamente)
  document.body.addEventListener("click", (e) => {
    const pay = e.target.closest("[data-mp-pay]");
    if (pay) { e.preventDefault(); pulsarPay(pay.dataset.mpPay); }
    const chk = e.target.closest("[data-mp-check]");
    if (chk) { e.preventDefault(); pulsarCheckPayment(false); }
  });

  // ao voltar do checkout (#pago) ou com pagamento pendente, fica verificando
  function pollBack() {
    if (!backend() || !(typeof getSession === "function" && getSession())) return;
    const returned = location.hash.replace("#", "") === "pago";
    const pending = localStorage.getItem("pulsar_pending_plan");
    if (!returned && !pending) return;
    if (returned) location.hash = "meta";
    let tries = 0;
    const tick = async () => {
      tries++;
      const ok = await pulsarCheckPayment(true);
      if (!ok && tries < 12) setTimeout(tick, 3000); // ~36s
    };
    tick();
  }

  // espera o auth restaurar a sessão
  setTimeout(pollBack, 400);
})();
