/* ============================================================
   PulsarAds — Ponte com a extensão "PulsarAds Espelho"
   Se a extensão estiver instalada, o Explorador espelha os
   anúncios reais em segundo plano (imagens, avatar, nome…).
   Sem ela, tudo continua funcionando no modo manual.
   ============================================================ */
"use strict";

(function () {
  window.PULSAR_EXT = false;
  const pending = {};

  window.addEventListener("message", (ev) => {
    const d = ev.data;
    if (!d || d.app !== "pulsarads-ext") return;
    if (d.type === "ready") {
      if (!window.PULSAR_EXT) {
        window.PULSAR_EXT = true;
        document.dispatchEvent(new CustomEvent("pulsar-ext-ready"));
      }
    }
    if ((d.type === "result" || d.type === "pong") && d.reqId && pending[d.reqId]) {
      pending[d.reqId](d.ads || d);
      delete pending[d.reqId];
    }
  });

  // busca real via extensão; resolve com array de anúncios ou null se indisponível
  window.pulsarExtSearch = (queries, country) => new Promise((resolve) => {
    if (!window.PULSAR_EXT) return resolve(null);
    const reqId = "r" + Date.now() + "_" + Math.random().toString(36).slice(2);
    pending[reqId] = (ads) => resolve(Array.isArray(ads) ? ads : (ads && ads.ads) || null);
    window.postMessage({ app: "pulsarads", cmd: "searchMirror", queries, country, reqId }, "*");
    setTimeout(() => { if (pending[reqId]) { delete pending[reqId]; resolve(null); } }, 90000);
  });

  window.pulsarExtAvailable = () => window.PULSAR_EXT;
})();
