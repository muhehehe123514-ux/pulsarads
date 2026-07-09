/* ============================================================
   PulsarAds — Receptor do "🪞 Espelhar anúncio"
   O bookmarklet, rodando na Biblioteca de Anúncios do Facebook,
   abre o site com os dados reais do anúncio no hash (#mirror=...).
   Aqui a gente decodifica e mostra na prévia com as imagens,
   o avatar e o nome REAIS. Depois é só Modelar.
   ============================================================ */

"use strict";

(function () {
  function decode(str) {
    try { return JSON.parse(decodeURIComponent(escape(atob(str)))); }
    catch { try { return JSON.parse(decodeURIComponent(str)); } catch { return null; } }
  }

  // adivinha o nicho a partir do texto do anúncio (usa o dataset NICHES)
  function guessNiche(text) {
    if (typeof NICHES === "undefined") return -1;
    const t = (text || "").toLowerCase();
    let best = -1, score = 0;
    NICHES.forEach((n, i) => {
      let sc = 0;
      (n.kws || []).forEach((k) => { const w = k.toLowerCase().split(" ")[0]; if (w.length > 3 && t.includes(w)) sc++; });
      const nm = (n.name || "").toLowerCase().split(" ")[0];
      if (nm.length > 3 && t.includes(nm)) sc += 2;
      if (sc > score) { score = sc; best = i; }
    });
    return best;
  }

  let done = false;
  function handle() {
    if (done) return;
    const m = (location.hash || "").match(/[#&]mirror=([^&]+)/);
    if (!m) return;
    // espera ter sessão (usuário logado) pra a prévia não abrir atrás do login
    if (typeof getSession === "function" && !getSession()) return;
    const data = decode(m[1]);
    done = true;
    history.replaceState(null, "", location.pathname + "#biblioteca");
    if (!data) { if (window.toast) toast("Não consegui ler os dados espelhados 😕 Tente de novo."); return; }

    const imgs = (data.imgs || []).filter(Boolean).slice(0, 8);
    const offer = {
      name: (data.name || data.page || "Oferta do Facebook").slice(0, 90),
      advertiser: data.page || data.advertiser || "",
      avatarUrl: data.avatar || "",
      imgUrls: imgs,
      creative: imgs[0] || "",
      desc: data.text || "",
      fbPage: data.pageUrl || "",
      site: data.site || "",
      ads: (data.ads != null ? data.ads : null),
      country: data.country || "BR",
      lang: data.lang || "Português",
      published: data.started || null,
      libraryId: data.libraryId || "",
      niche: guessNiche((data.name || "") + " " + (data.text || "") + " " + (data.page || "")),
      hasVsl: /\bvsl\b|assista|v[ií]deo/i.test(data.text || ""),
      libUrl: data.libUrl || "",
      status: "escalando",
      _mirror: true, _live: true,
    };
    if (location.hash !== "#biblioteca") location.hash = "#biblioteca";
    if (window.renderPreviewModal) {
      window.renderPreviewModal(offer, {});
      if (window.toast) toast(imgs.length ? `Anúncio espelhado! 🪞 ${imgs.length} imagem(ns) real(is)` : "Anúncio espelhado! 🪞");
    }
  }

  window.addEventListener("hashchange", handle);
  // tenta algumas vezes no boot (espera o login/scripts)
  let tries = 0;
  const iv = setInterval(() => { handle(); if (done || ++tries > 40) clearInterval(iv); }, 400);
  setTimeout(handle, 200);
})();
