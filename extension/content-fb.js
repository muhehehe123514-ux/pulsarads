/* PulsarAds Espelho — content script v4
   Captura cada card de anúncio da Biblioteca de Anúncios com TODOS os
   dados visíveis: status, ID da biblioteca, data, plataformas, versões,
   copy, criativos (img/vídeo), domínio, headline, CTA, ticket e site. */
(function () {
  "use strict";

  // "Identificação da biblioteca", "Identificação na biblioteca", "Library ID"
  var MARK_RE = /library\s*id|identifica[^\n]{0,30}biblioteca|identifica[^\n]{0,30}an[uú]ncio/i;

  var CTA_RE = /^(Saiba mais|Comprar agora|Cadastre-se|Enviar mensagem|Fale conosco|Ver mais|Baixar|Ligar agora|Obter oferta|Obter cota[çc][ãa]o|Assinar|Reservar agora|Solicitar agora|Inscrever-se|Instalar agora|Jogar|Enviar mensagem pelo WhatsApp|Send WhatsApp|Send [Mm]essage|Learn [Mm]ore|Shop [Nn]ow|Sign [Uu]p|Download|Get [Oo]ffer|Contact [Uu]s|Book [Nn]ow|Subscribe|Apply [Nn]ow|Watch [Mm]ore|Use [Aa]pp|See [Mm]enu|Order [Nn]ow|Pedir agora|Ver card[áa]pio)$/;

  var PLAT_ORDER = ["facebook", "instagram", "audience_network", "messenger", "threads", "whatsapp"];

  function leafText(el) { return (el.innerText || "").trim(); }

  // elementos "de texto": sem divs/section/ul dentro (aceita <br>, <b>, <span>…)
  function textBlocks(card) {
    var out = [];
    var els = [].slice.call(card.querySelectorAll("div, span, p"));
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.querySelector("div, section, ul, table, video, img")) continue;
      var t = leafText(el);
      if (t) out.push({ el: el, t: t });
    }
    return out;
  }

  function totalResults() {
    var m = (document.body.innerText || "").match(/(~?\s*[\d.,]+)\s+(resultados?|results?)\b/i);
    return m ? m[1].replace(/\s+/g, "") : null;
  }

  function collectAds() {
    var out = [];
    var seenCard = [];
    var seenId = {};

    var marks = [].slice.call(document.querySelectorAll("span, div"))
      .filter(function (el) {
        if (el.childElementCount > 2) return false;
        var t = el.textContent || "";
        return t.length < 90 && MARK_RE.test(t);
      });

    marks.forEach(function (mark) {
      // sobe até o container do card (tem mídia + texto longo)
      var card = mark;
      for (var i = 0; i < 10; i++) {
        if (!card.parentElement) break;
        card = card.parentElement;
        if (card.querySelector("img, video") && (card.innerText || "").length > 120) break;
      }
      // se parou cedo demais (antes do bloco do vídeo), expande — sem engolir outro anúncio
      if (!card.querySelector("video")) {
        var up = card.parentElement, lvl = 0;
        while (up && lvl < 3) {
          if (up.querySelector("video")) {
            var swallows = false;
            for (var mi = 0; mi < marks.length; mi++) {
              if (marks[mi] !== mark && up.contains(marks[mi])) { swallows = true; break; }
            }
            if (!swallows) card = up;
            break;
          }
          up = up.parentElement; lvl++;
        }
      }
      if (seenCard.indexOf(card) >= 0) return;
      seenCard.push(card);

      var txt = card.innerText || "";
      var libId = (txt.match(/(\d{9,})/) || [])[1] || "";
      if (libId) { if (seenId[libId]) return; seenId[libId] = 1; }

      // STATUS (badge "Ativo"/"Inativo" no topo do card)
      var head = txt.slice(0, 60);
      var active = /\b(Ativo|Active)\b/.test(head) && !/\b(Inativo|Inactive)\b/.test(head);

      // DATA DE INÍCIO (PT e EN)
      var started = "";
      var ptDate = txt.match(/(\d{1,2})\s+de\s+([a-zç]{3,})\.?\s+de\s+(\d{4})/i);
      var ptSlash = txt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (ptDate) started = ptDate[1] + " de " + ptDate[2] + " de " + ptDate[3];
      else if (ptSlash) started = ptSlash[1] + "/" + ptSlash[2] + "/" + ptSlash[3];
      else {
        var enMatch = txt.match(/(?:started running on|iniciada em|ativo desde|começou a ser)\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i);
        if (enMatch) started = enMatch[1];
      }

      // Nº DE ANÚNCIOS ATIVOS DO ANUNCIANTE
      var adsMatch = txt.match(/(\d{1,4})\s+(?:anúncios|ads|active ads|anúncios ativos)/i);
      var ads = adsMatch ? parseInt(adsMatch[1].replace(/\./g, ""), 10) : null;

      // VERSÕES ("Esse anúncio tem várias versões" / "4 anúncios usam esse criativo")
      var multiVersions = /v[áa]rias vers[õo]es|multiple versions/i.test(txt);
      var verMatch = txt.match(/(\d{1,3})\s+an[uú]ncios usam/i);
      var versions = verMatch ? parseInt(verMatch[1], 10) : null;

      // TICKET REAL — "R$ 19,90", "por apenas 19,90", "somente 27"
      var price = null;
      var priceMatch = txt.match(/R\$\s*(\d{1,3}(?:[.,]\d{1,2})?)/) ||
                       txt.match(/por\s+apenas\s+(\d{1,3}[.,]\d{2})/i) ||
                       txt.match(/(?:somente|apenas|s[óo])\s+(\d{1,3}[.,]\d{2})/i);
      if (priceMatch) {
        var valor = parseFloat(priceMatch[1].replace(",", "."));
        if (valor >= 1 && valor <= 9999) price = valor;
      }

      // PLATAFORMAS (ícones após o rótulo "Plataformas")
      var platforms = [];
      var blocks = textBlocks(card);
      for (var p = 0; p < blocks.length; p++) {
        if (/^Plataformas?$|^Platforms?$/i.test(blocks[p].t)) {
          var row = blocks[p].el.parentElement;
          for (var up = 0; up < 3 && row; up++) {
            var icons = row.querySelectorAll('[style*="mask-image"], [style*="mask-position"]');
            if (icons.length) {
              platforms = PLAT_ORDER.slice(0, Math.min(icons.length, 6));
              break;
            }
            row = row.parentElement;
          }
          break;
        }
      }

      // IMAGENS (só deste card) — funciona mesmo se ainda não carregaram
      // (lazy-load em aba de fundo deixa naturalWidth = 0; aí decide pela URL)
      var imgEls = [].slice.call(card.querySelectorAll("img"))
        .filter(function (im) { return /fbcdn|scontent/.test(im.currentSrc || im.src || ""); });
      var cre = [];
      var avatar = "";
      imgEls.forEach(function (im) {
        var w = im.naturalWidth || im.width || 0, h = im.naturalHeight || im.height || 0;
        var s = im.currentSrc || im.src;
        // avatar SÓ quando a URL indica dimensão pequena (s60x60…) — /s600x600/ é criativo!
        var dimM = s.match(/\/[sp](\d{2,4})x(\d{2,4})\//);
        var smallUrl = (dimM && +dimM[1] <= 160 && +dimM[2] <= 160) || /_[sq]\.(jpg|png)/.test(s);
        if (!avatar && (smallUrl || (w > 0 && w <= 140 && Math.abs(w - h) < 16))) { avatar = s; return; }
        if (smallUrl) return;
        if (w >= 180 || h >= 180 || (!w && !h)) cre.push({ u: s, a: w * h });
      });
      cre.sort(function (a, b) { return b.a - a.a; }); // maiores primeiro; desconhecidas mantêm a ordem
      var imgs = [];
      cre.forEach(function (c) { if (imgs.indexOf(c.u) < 0) imgs.push(c.u); });
      if (!avatar) {
        var sm = imgEls.filter(function (im) { return (im.naturalWidth || im.width || 999) <= 140; });
        if (sm[0]) avatar = sm[0].currentSrc || sm[0].src;
      }

      // VÍDEOS — só URLs http(s) servem fora do FB; blob: vira a thumb (poster)
      var videos = [], posters = [];
      [].slice.call(card.querySelectorAll("video")).forEach(function (v) {
        var src = v.currentSrc || v.src || "";
        if (!src || src.indexOf("blob:") === 0) {
          var so = v.querySelector("source");
          if (so) src = so.src || so.getAttribute("src") || "";
        }
        if (/^https?:/.test(src) && videos.indexOf(src) < 0) {
          videos.push(src);
          posters.push(v.poster || "");
        } else if (v.poster && imgs.indexOf(v.poster) < 0) {
          imgs.push(v.poster); // pelo menos a capa do vídeo fica baixável
        }
      });

      // PÁGINA DO ANUNCIANTE (link interno FB)
      var page = "", pageUrl = "";
      var links = [].slice.call(card.querySelectorAll('a[href*="facebook.com/"]'));
      for (var l = 0; l < links.length; l++) {
        var t = leafText(links[l]);
        if (t && t.length > 1 && t.length < 60 && !/^https?:/.test(t) &&
            !/^(ver|see|all|todos|mais|more|sobre|about|patrocinado|sponsored)$/i.test(t)) {
          page = t; pageUrl = links[l].href.split("?")[0]; break;
        }
      }

      // SITE EXTERNO (link de destino real)
      var site = "";
      var extLinks = [].slice.call(card.querySelectorAll('a[href*="l.facebook.com/l.php"], a[href]:not([href*="facebook.com"])'));
      for (var x = 0; x < extLinks.length; x++) {
        var href = extLinks[x].href || "";
        var u = href.match(/[?&]u=([^&]+)/);
        if (u) href = decodeURIComponent(u[1]);
        if (href && /^https?:\/\//.test(href) && !/facebook\.com|fbcdn|scontent/.test(href)) {
          site = href.split("?")[0]; break;
        }
      }

      // DOMÍNIO exibido (ex.: API.WHATSAPP.COM), HEADLINE (título junto do CTA) e CTA
      var domain = "", headline = "", cta = "";
      var domIdx = -1;
      for (var b = 0; b < blocks.length; b++) {
        var bt = blocks[b].t;
        if (!domain && bt.length < 42 && /^[A-Z0-9][-A-Z0-9]*(\.[A-Z0-9-]+)+$/.test(bt)) {
          domain = bt; domIdx = b;
        }
        if (!cta && bt.length < 40 && CTA_RE.test(bt)) cta = bt;
      }
      if (domIdx >= 0) {
        for (var hb = domIdx + 1; hb < Math.min(domIdx + 4, blocks.length); hb++) {
          var ht = blocks[hb].t;
          if (ht.length >= 3 && ht.length <= 90 && !CTA_RE.test(ht) && ht !== domain) { headline = ht; break; }
        }
      }
      if (!site && domain && !/FACEBOOK|FBCDN|INSTAGRAM/.test(domain)) {
        site = "https://" + domain.toLowerCase();
      }

      // COPY DO ANÚNCIO (maior bloco de texto que não é metadado)
      var text = "";
      for (var n = 0; n < blocks.length; n++) {
        var tb = blocks[n].t;
        if (tb.length > text.length && tb.length > 30 && tb.length < 3000 &&
            !MARK_RE.test(tb) &&
            !/^(Ativo|Inativo|Patrocinado|Sponsored|Plataformas)/.test(tb) &&
            !/veicula\S*\s+iniciada|started running/i.test(tb)) text = tb;
      }

      // DETECÇÃO DE VSL
      var hasVsl = videos.length > 0 ||
                   /\bvsl\b|assista ao v[ií]deo|youtube\.com|youtu\.be|vimeo\.com/i.test(text);

      if (imgs.length || videos.length || page) {
        out.push({
          name: (headline || (text.split("\n")[0] || page || "Oferta")).trim().slice(0, 90),
          page: page, pageUrl: pageUrl, avatar: avatar,
          imgs: imgs.slice(0, 8),
          videos: videos.slice(0, 3),
          posters: posters.slice(0, 3),
          text: text, started: started, libraryId: libId,
          ads: ads, site: site, price: price, hasVsl: hasVsl,
          active: active, platforms: platforms,
          versions: versions, multiVersions: multiVersions,
          domain: domain, headline: headline, cta: cta,
        });
      }
    });
    return { ads: out, total: totalResults() };
  }

  chrome.runtime.onMessage.addListener(function (msg, sender, send) {
    if (msg && msg.cmd === "scrapeFb") {
      var tries = 0;
      var tick = function () {
        var res = collectAds();
        // achou um bom lote OU esgotou as tentativas → devolve
        if (res.ads.length >= 4 || tries > 10 || (res.ads.length && tries > 5)) { send(res); return; }
        // rola a página pra forçar o carregamento dos próximos anúncios
        try { window.scrollBy(0, 1000); } catch (e) {}
        tries++;
        setTimeout(tick, 800);
      };
      tick();
      return true;
    }
  });
})();
