/* PulsarAds Espelho — service worker.
   Recebe a busca do site, abre a Biblioteca de Anúncios (pública) em abas
   de FUNDO, pede o scrape ao content script, junta tudo e devolve. */
"use strict";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitComplete(tabId, ms = 16000) {
  return new Promise((res) => {
    const done = () => { chrome.tabs.onUpdated.removeListener(l); res(); };
    const l = (id, info) => { if (id === tabId && info.status === "complete") done(); };
    chrome.tabs.onUpdated.addListener(l);
    setTimeout(done, ms);
  });
}

function fbUrl(q, country) {
  return "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=" +
    (country || "BR") + "&q=" + encodeURIComponent(q) + "&search_type=keyword_unordered&media_type=all";
}

/* Visita a página de destino do anúncio (VSL / página de vendas) e extrai:
   - TICKET real: preço mais frequente no HTML (R$ …)
   - VSL: presença de player de vídeo (vturb, converteai, panda, youtube…) */
async function enrichFromSite(ad) {
  if (!ad.site || !/^https?:/i.test(ad.site)) return;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(ad.site, { signal: ctrl.signal, redirect: "follow", credentials: "omit" });
    clearTimeout(t);
    const html = (await r.text()).slice(0, 500000);

    if (ad.price == null) {
      const count = {};
      const re = /R\$\s*(?:&nbsp;|\s)*(\d{1,3}(?:\.\d{3})?(?:,\d{2})?|\d{1,4}(?:\.\d{2})?)/g;
      let m;
      while ((m = re.exec(html))) {
        let raw = m[1];
        let v = raw.includes(",")
          ? parseFloat(raw.replace(/\./g, "").replace(",", "."))
          : parseFloat(raw);
        if (v >= 5 && v <= 1000) {
          const k = v.toFixed(2);
          count[k] = (count[k] || 0) + 1;
        }
      }
      const keys = Object.keys(count);
      if (keys.length) {
        keys.sort((a, b) => (count[b] - count[a]) || (parseFloat(a) - parseFloat(b)));
        ad.price = parseFloat(keys[0]);
        ad.priceFromSite = true;
      }
    }
    if (!ad.hasVsl && /vturb|converteai|smartplayer|pandavideo|panda-video|wistia|vimeo|youtube\.com\/embed|vsl/i.test(html)) {
      ad.hasVsl = true;
    }
  } catch (_) {}
}

async function mirrorSearch(queries, country) {
  const all = [];
  const seen = new Set();
  let total = null;
  const qs = (queries || []).slice(0, 6);
  for (const q of qs) {
    const url = fbUrl(q, country);
    let tab;
    try {
      tab = await chrome.tabs.create({ url, active: false });
      await waitComplete(tab.id);
      await sleep(3500); // deixa os anúncios renderizarem
      let res = { ads: [] };
      try { res = await chrome.tabs.sendMessage(tab.id, { cmd: "scrapeFb" }); } catch (_) {}
      if (res && res.total && !total) total = res.total;
      (res && res.ads || []).forEach((a) => {
        const k = a.libraryId || (a.page + "|" + a.name);
        if (!seen.has(k)) { seen.add(k); a.country = country; a.query = q; a.libUrl = url; all.push(a); }
      });
    } catch (_) {}
    finally { if (tab) { try { await chrome.tabs.remove(tab.id); } catch (_) {} } }
    if (all.length >= 30) break;
  }
  // enriquece com o ticket real da página de vendas (em paralelo, sem travar)
  await Promise.allSettled(
    all.filter((a) => a.site && (a.price == null || !a.hasVsl)).slice(0, 12).map(enrichFromSite)
  );
  return { ads: all, total };
}

chrome.runtime.onMessage.addListener((msg, sender, send) => {
  if (msg && msg.cmd === "ping") { send({ ok: true, ext: "pulsarads-espelho" }); return true; }
  if (msg && msg.cmd === "searchMirror") {
    mirrorSearch(msg.queries || [], msg.country || "BR")
      .then((r) => send({ ads: r.ads, total: r.total }))
      .catch(() => send({ ads: [], total: null }));
    return true; // assíncrono
  }
});
