/* PulsarAds Espelho — content script na Biblioteca de Anúncios do Facebook.
   Lê os anúncios VISÍVEIS na página (dados públicos) e devolve pro background:
   imagens do criativo, foto de perfil, nome do anunciante, texto/copy,
   Library ID e data. É a mesma leitura que você faria com os olhos. */
(function () {
  "use strict";

  function collectAds() {
    const out = [];
    const seenCard = new Set();
    const seenId = new Set();

    // cada anúncio tem um "Library ID / Identificação na biblioteca"
    const marks = [].slice.call(document.querySelectorAll("span, div"))
      .filter((el) => el.childElementCount === 0 && /library id|identifica\S*\s+na biblioteca|identifica\S*\s+do an/i.test(el.textContent || "") && (el.textContent || "").length < 80);

    marks.forEach((mark) => {
      // sobe até um container que tenha imagem e texto (o card do anúncio)
      let card = mark;
      for (let i = 0; i < 9; i++) {
        if (!card.parentElement) break;
        card = card.parentElement;
        if (card.querySelector("img") && (card.innerText || "").length > 80) break;
      }
      if (seenCard.has(card)) return;
      seenCard.add(card);

      const txt = card.innerText || "";
      const libId = (txt.match(/(\d{9,})/) || [])[1] || "";
      if (libId) { if (seenId.has(libId)) return; seenId.add(libId); }

      const started = (txt.match(/(?:started running on|veicula\S*\s+iniciada em|ativo desde|come\S*ou a ser)\s*([^\n]{4,44})/i) || [])[1] || "";

      const imgEls = [].slice.call(card.querySelectorAll("img"))
        .filter((im) => /fbcdn|scontent/.test(im.currentSrc || im.src || ""));
      const cre = [];
      let avatar = "";
      imgEls.forEach((im) => {
        const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
        const s = im.currentSrc || im.src;
        if (w >= 180 || h >= 180) cre.push({ u: s, a: w * h });
        else if (!avatar && Math.abs(w - h) < 16 && w >= 24 && w <= 140) avatar = s;
      });
      cre.sort((a, b) => b.a - a.a);
      const imgs = [];
      cre.forEach((c) => { if (imgs.indexOf(c.u) < 0) imgs.push(c.u); });
      if (!avatar) { const sm = imgEls.filter((im) => (im.naturalWidth || im.width) <= 140); if (sm[0]) avatar = sm[0].currentSrc || sm[0].src; }

      let page = "", pageUrl = "";
      const links = [].slice.call(card.querySelectorAll('a[href*="facebook.com/"]'));
      for (const a of links) {
        const t = (a.innerText || "").trim();
        if (t && t.length > 1 && t.length < 60 && !/^https?:/.test(t) && !/^(ver|see|all|todos|mais|more|sobre|about|patrocinado|sponsored)$/i.test(t)) { page = t; pageUrl = a.href.split("?")[0]; break; }
      }

      let text = "";
      const blocks = [].slice.call(card.querySelectorAll("div, span, p"));
      for (const d of blocks) {
        if (d.childElementCount === 0) {
          const t = (d.innerText || "").trim();
          if (t.length > text.length && t.length > 30 && t.length < 1600 && !/library id|identifica\S/i.test(t)) text = t;
        }
      }

      if (imgs.length || page) {
        out.push({
          name: ((text.split("\n")[0] || page || "Oferta").trim()).slice(0, 90),
          page, pageUrl, avatar, imgs: imgs.slice(0, 6), text, started, libraryId: libId,
        });
      }
    });
    return out;
  }

  chrome.runtime.onMessage.addListener((msg, sender, send) => {
    if (msg && msg.cmd === "scrapeFb") {
      // tenta algumas vezes (a página carrega os anúncios aos poucos)
      let tries = 0;
      const tick = () => {
        const ads = collectAds();
        if (ads.length || tries++ > 8) { send({ ads }); return; }
        setTimeout(tick, 900);
      };
      tick();
      return true; // resposta assíncrona
    }
  });
})();
