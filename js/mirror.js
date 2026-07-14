/* ============================================================
PulsarAds — Receptor do "🪞 Espelhar anúncio" (v3)
Agora recebe também vídeos, ticket real, site externo, nº de anúncios.
============================================================ */
"use strict";
(function () {
  function decode(str) {
    try { return JSON.parse(decodeURIComponent(escape(atob(str)))); }
    catch { try { return JSON.parse(decodeURIComponent(str)); } catch { return null; } }
  }

  function guessNiche(text) {
    if (typeof NICHES === "undefined") return -1;
    const t = (text || "").toLowerCase();
    let best = -1, score = 0;
    NICHES.forEach((n, i) => {
      let sc = 0;
      const seen = new Set();
      (n.kws || []).forEach((k) => {
        k.toLowerCase().split(/\s+/).forEach((w) => {
          if (w.length >= 5 && !seen.has(w) && t.includes(w)) { seen.add(w); sc += 2; }
        });
      });
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
    if (typeof getSession === "function" && !getSession()) return;
    const data = decode(m[1]);
    done = true;
    history.replaceState(null, "", location.pathname + "#biblioteca");
    if (!data) { if (window.toast) toast("Não consegui ler os dados espelhados 😕 Tente de novo."); return; }

    const imgs = (data.imgs || []).filter(Boolean).slice(0, 8);
    const videos = (data.videos || []).filter((u) => u && /^https?:/i.test(u)).slice(0, 3);
    const posters = (data.posters || []).filter(Boolean).slice(0, 3);
    if (!videos.length && !imgs.length && posters.length) imgs.push(...posters);

    const goodName = (s) => {
      s = (s || "").trim();
      if (s.length < 6) return "";
      if (/^(apenas|s[óo]\b|por apenas|promo[çc][ãa]o|oferta|r\$|\d|saiba mais|compre|garanta|acesse|clique|link|www\.)/i.test(s)) return "";
      if (/r\$\s*\d/i.test(s) && s.length < 34) return "";
      return s;
    };
    const nameCand = goodName(data.name) || goodName(data.headline) ||
      (data.text || "").split("\n").map(goodName).find(Boolean) || data.page || "Oferta do Facebook";

    const offer = {
      name: nameCand.slice(0, 90),
      advertiser: data.page || data.advertiser || "",
      avatarUrl: data.avatar || "",
      imgUrls: imgs,
      videoUrls: videos,
      videoPosters: posters,
      creative: videos[0] || imgs[0] || "",
      desc: data.text || "",
      fbPage: data.pageUrl || "",
      site: data.site || "",
      ads: (data.ads != null ? data.ads : null),
      price: (data.price != null && !isNaN(data.price) && data.price > 0 && data.price < 10000) ? data.price : null,
      country: data.country || "BR",
      lang: data.lang || "Português",
      published: data.started || null,
      libraryId: data.libraryId || "",
      niche: guessNiche((data.name || "") + " " + (data.text || "") + " " + (data.page || "")),
      hasVsl: data.hasVsl || /\bvsl\b|assista|v[ií]deo|youtube|youtu\.be|vimeo/i.test(data.text || ""),
      libUrl: data.libUrl || "",
      status: "escalando",
      statusActive: data.active !== false,
      platforms: data.platforms || [],
      versionsCount: data.versions || null,
      multiVersions: !!(data.multiV || data.multiVersions),
      cta: data.cta || "",
      domain: data.domain || "",
      headline: data.headline || "",
      followers: data.followers || "",
      handles: data.handles || [],
      bio: data.bio || "",
      _mirror: true, _live: true,
    };

    if (location.hash !== "#biblioteca") location.hash = "#biblioteca";
    if (window.renderPreviewModal) {
      window.renderPreviewModal(offer, {});
      if (window.toast) {
        const total = imgs.length + videos.length;
        toast(total ? `Anúncio espelhado! 🪞 ${total} criativo(s) real(is)` : "Anúncio espelhado! 🪞");
      }
    }
  }

  window.addEventListener("hashchange", handle);
  let tries = 0;
  const iv = setInterval(() => { handle(); if (done || ++tries > 40) clearInterval(iv); }, 400);
  setTimeout(handle, 200);
})();