/* ============================================================
PulsarAds — Biblioteca de Ofertas v5 (DEFINITIVA)
Bookmarklet agora lê APENAS o modal de detalhes do anúncio
que você clicou na Biblioteca do Facebook.
============================================================ */
"use strict";
const LIB_KEY = "pulsar_offers";
const loadOffers = () => JSON.parse(localStorage.getItem(LIB_KEY) || "[]");
const saveOffers = (o) => localStorage.setItem(LIB_KEY, JSON.stringify(o));
const NICHE_EMOJI = ["🍰","🧁","🧶","🐶","💪","🌿","💄","🧵","👶","📚","🗣️","🎸","💰","📈","🧘","🏡"];
const LIB_STATUS = {
  escalando: { label: "🔥 Escalando", cls: "chip-hot" },
  validando: { label: "🧪 Validando", cls: "chip-watch" },
  observando: { label: "👀 Observando", cls: "chip-watch" },
  morta: { label: "💀 Morreu", cls: "chip-dead" },
};

$("#lfNiche").innerHTML =
  NICHES.map((n, i) => `<option value="${i}">${n.name}</option>\n`).join("") +
  `<option value="-1">Outro</option>\n`;
$("#libNicheFilter").innerHTML =
  `<option value="">Todos</option>\n` +
  NICHES.map((n, i) => `<option value="${i}">${n.name}</option>\n`).join("") +
  `<option value="-1">Outro</option>\n`;

const libDays = (o) => {
  if (!o.firstSeen) return 1;
  return Math.max(1, Math.round((Date.now() - new Date(o.firstSeen + "T12:00:00").getTime()) / 86400000));
};
const libSearchUrl = (o) =>
  o.url ||
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${o.country || "BR"}&q=${encodeURIComponent(o.name)}&search_type=keyword_unordered&media_type=all`;

function renderLibrary() {
  const offers = loadOffers();
  const q = $("#libSearch").value.trim().toLowerCase();
  const nicheF = $("#libNicheFilter").value;
  const statusF = $("#libStatusFilter").value;
  let list = offers.map((o, idx) => ({ ...o, idx }));
  if (q) list = list.filter((o) => `${o.name} ${o.advertiser} ${o.notes}\n`.toLowerCase().includes(q));
  if (nicheF !== "") list = list.filter((o) => String(o.niche) === nicheF);
  if (statusF) list = list.filter((o) => o.status === statusF);
  const rank = { escalando: 0, observando: 1, morta: 2 };
  list.sort((a, b) => (b.fav - a.fav) || (rank[a.status] - rank[b.status]) || (b.ads - a.ads));
  const grid = $("#offerGrid");
  if (!list.length) {
    grid.innerHTML = `<div class="viz-empty" style="grid-column:1/-1">${offers.length ? "Nenhuma oferta com esses filtros." : "Sua Biblioteca está vazia. Ela guarda <strong>só ofertas reais</strong>: garimpe na <a class=\"link-inline\" href=\"#ofertas\">🔥 Explorador de Ofertas</a> e clique em ➕ Biblioteca, importe pelo bookmarklet da biblioteca do Facebook, ou clique em ➕ Nova oferta pra cadastrar uma que você encontrou."}</div>\n`;
    return;
  }
  grid.innerHTML = list
    .map((o) => {
      const st = LIB_STATUS[o.status] || LIB_STATUS.observando;
      const emoji = o.niche >= 0 && NICHE_EMOJI[o.niche] ? NICHE_EMOJI[o.niche] : "🔥";
      const nicheName = o.niche >= 0 && NICHES[o.niche] ? NICHES[o.niche].name : "Outro";
      const isVsl = o.hasVsl || /vsl/i.test(o.funnel || "");
      const thumbUrl = o.avatarUrl || (o.imgUrls && o.imgUrls[0]) || (o.videoPosters && o.videoPosters[0]) || (o.img && typeof imgById === "function" ? imgById(o.img)?.dataUrl : null);
      return `<article class="offer-card">
        <div class="oc-head">
          <div class="oc-avatar">${thumbUrl ?
            `<img src="${escHtml(thumbUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:11px" />` : emoji}</div>
          <div class="oc-title">
            <strong>${escHtml(o.name)}</strong>
            <span>${escHtml(o.advertiser || "anunciante não anotado")}</span>
          </div>
          <button class="oc-fav ${o.fav ? "on" : ""}" data-lib-fav="${o.idx}" title="Favoritar">${o.fav ? "♥" : "♡"}</button>
        </div>
        <div class="oc-chips">
          <span class="chip">${escHtml(nicheName)}</span>
          <span class="chip">VSL: ${isVsl ? "Sim" : "Não"}</span>
          <span class="chip ${st.cls}">${st.label}</span>
        </div>
        ${o.notes ? `<p class="oc-notes">${escHtml(o.notes)}</p>\n` : ""}
        <div class="oc-stats">
          <div class="oc-stat"><span class="ocs-val">${o.ads ?? "—"}</span><span class="ocs-lbl">👥 Anúncios</span></div>
          <div class="oc-stat"><span class="ocs-val">${libDays(o)}</span><span class="ocs-lbl">📅 Dias</span></div>
          <div class="oc-stat"><span class="ocs-val">${o.price ? "R$ " + (+o.price).toFixed(2).replace(".", ",").replace(",00", "") : "—"}</span><span class="ocs-lbl">💵 Ticket</span></div>
        </div>
        <div class="oc-foot">
          <span class="hint">visto ${o.firstSeen ? o.firstSeen.split("-").reverse().join("/") : "—"} · check ${o.lastChecked ? o.lastChecked.split("-").reverse().join("/") : "—"}</span>
          <div class="oc-actions">
            <button class="btn-copy" data-lib-edit="${o.idx}" title="Editar">✏️</button>
            <button class="btn-copy" data-lib-del="${o.idx}" title="Excluir">✕</button>
            <button class="btn btn-primary btn-sm oc-see" data-lib-view="${o.idx}">👁 Ver Detalhes</button>
          </div>
        </div>
      </article>\n`;
    })
    .join("");
}

function libOpenForm(idx = null) {
  const card = $("#libFormCard");
  card.hidden = false;
  $("#libFormTitle").textContent = idx === null ? "Nova oferta" : "Editar oferta";
  $("#libEditIdx").value = idx === null ? "" : idx;
  if (idx !== null) {
    const o = loadOffers()[idx];
    $("#lfName").value = o.name || "";
    $("#lfAdvertiser").value = o.advertiser || "";
    $("#lfNiche").value = o.niche ?? -1;
    $("#lfCountry").value = o.country || "BR";
    $("#lfAds").value = o.ads ?? "";
    $("#lfPrice").value = o.price ?? "";
    $("#lfFunnel").value = o.funnel || "Página de vendas direta";
    $("#lfStatus").value = o.status || "observando";
    $("#lfFormat").value = o.format || "X1 Low Ticket";
    $("#lfLang").value = o.lang || "Português";
    if (window.renderGalleryAll) renderGalleryAll();
    $("#lfImg").value = o.img || "";
    $("#lfDesc").value = o.desc || "";
    $("#lfFbPage").value = o.fbPage || "";
    $("#lfSite").value = o.site || "";
    $("#lfCreative").value = o.creative || "";
    $("#lfUrl").value = o.url || "";
    $("#lfNotes").value = o.notes || "";
  } else {
    $("#libForm").reset();
    $("#lfCountry").value = "BR";
  }
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

window.libOpenForm = libOpenForm;
$("#btnLibNew").addEventListener("click", () => libOpenForm());
$("#btnLibCancel").addEventListener("click", () => ($("#libFormCard").hidden = true));

$("#libForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const offers = loadOffers();
  const idx = $("#libEditIdx").value;
  const today = new Date().toISOString().slice(0, 10);
  const rec = {
    name: $("#lfName").value.trim(),
    advertiser: $("#lfAdvertiser").value.trim(),
    niche: +$("#lfNiche").value,
    country: $("#lfCountry").value.trim().toUpperCase() || "BR",
    ads: $("#lfAds").value === "" ? null : +$("#lfAds").value,
    price: $("#lfPrice").value === "" ? null : +$("#lfPrice").value,
    funnel: $("#lfFunnel").value,
    status: $("#lfStatus").value,
    format: $("#lfFormat").value,
    lang: $("#lfLang").value,
    img: $("#lfImg").value,
    desc: $("#lfDesc").value.trim(),
    fbPage: $("#lfFbPage").value.trim(),
    site: $("#lfSite").value.trim(),
    creative: $("#lfCreative").value.trim(),
    url: $("#lfUrl").value.trim(),
    notes: $("#lfNotes").value.trim(),
  };
  if (idx === "") {
    offers.push({ ...rec, firstSeen: today, lastChecked: today, fav: false });
  } else {
    const old = offers[+idx];
    offers[+idx] = { ...old, ...rec, lastChecked: today };
  }
  saveOffers(offers);
  $("#libFormCard").hidden = true;
  renderLibrary();
  toast(idx === "" ? "Oferta adicionada 📚" : "Oferta atualizada 📚");
});

function infoTile(label, value) {
  return `<div class="info-tile"><span class="it-lbl">${label}</span><span class="it-val">${value}</span></div>\n`;
}
function linkTile(icon, title, desc, url) {
  const has = !!url;
  return `<a class="link-tile${has ? "" : " off"}" ${has ?
    `href="${escHtml(url)}" target="_blank" rel="noopener"` : ""}>
    <span class="lt-icon">${icon}</span>
    <span><strong>${title} ${has ? "↗" : ""}</strong><small>${has ? desc : "não cadastrado — edite a oferta pra adicionar"}</small></span>
  </a>\n`;
}

function openOfferModal(idx) {
  const offers = loadOffers();
  const o = offers[idx];
  if (!o) return;
  // ofertas espelhadas (com criativos reais) abrem no modal "Detalhes do anúncio" estilo FB
  if (((o.imgUrls && o.imgUrls.length) || (o.videoUrls && o.videoUrls.length)) && window.renderPreviewModal) {
    return window.renderPreviewModal(o, { libraryIdx: idx });
  }
  const st = LIB_STATUS[o.status] || LIB_STATUS.observando;
  const emoji = o.niche >= 0 && NICHE_EMOJI[o.niche] ? NICHE_EMOJI[o.niche] : "🔥";
  const nicheName = o.niche >= 0 && NICHES[o.niche] ? NICHES[o.niche].name : "Outro";
  const isVsl = o.hasVsl || /vsl/i.test(o.funnel || "");
  const avatarUrl = o.avatarUrl || (o.img && typeof imgById === "function" ? imgById(o.img)?.dataUrl : null);

  const galleryImgs = (o.imgUrls && o.imgUrls.length ? o.imgUrls : [])
    .map(u => ({ url: u, type: "img" }));
  const galleryVids = (o.videoUrls && o.videoUrls.length ? o.videoUrls : [])
    .map(u => ({ url: u, type: "video" }));
  const galleryAll = [...galleryImgs, ...galleryVids];

  if (!galleryAll.length && o.img && typeof imgById === "function" && imgById(o.img)) {
    galleryAll.push({ url: imgById(o.img).dataUrl, type: "img" });
  }

  const sameNiche = offers
    .map((x, i) => ({ ...x, i }))
    .filter((x) => x.i !== idx && x.niche === o.niche)
    .sort((a, b) => (b.ads || 0) - (a.ads || 0))
    .slice(0, 6);

  $("#offerModalBody").innerHTML = `<div class="om-head">
    <div class="oc-avatar big">${avatarUrl ?
      `<img src="${escHtml(avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:13px" />` : emoji}</div>
    <div>
      <h3>${escHtml(o.name)}</h3>
      <div class="oc-chips" style="margin-top:6px">
        <span class="chip">${escHtml(nicheName)}</span>
        <span class="chip">${escHtml((o.funnel || "").split(" ")[0] || "Funil")}</span>
        <span class="chip ${st.cls}">${st.label}</span>
      </div>
    </div>
  </div>
  ${galleryAll.length ?
    `<div class="fb-carousel" style="margin-top:14px">${galleryAll.map((it) =>
      `<div class="fb-slide">
        ${it.type === "video"
          ? `<video src="${escHtml(it.url)}" controls playsinline preload="metadata" data-fb-shot="${escHtml(it.url)}" style="width:100%;border-radius:12px"></video>`
          : `<img src="${escHtml(it.url)}" alt="criativo" loading="lazy" data-fb-shot="${escHtml(it.url)}">`}
      </div>`).join("")}
    </div>
    <div class="fb-count">🖼️🎬 ${galleryAll.length} criativo${galleryAll.length > 1 ? "s" : ""} — clique pra ampliar/baixar</div>` : ""}
  <div class="om-cols" style="margin-top:16px">
    <div>
      <h4 class="om-sec" style="margin-top:0">Descrição <button class="btn-copy" data-copy="${escHtml(o.desc || "")}" ${o.desc ? "" : "hidden"}>⧉ Copiar descrição</button></h4>
      <div class="om-desc">${o.desc ? escHtml(o.desc) : '<span class="hint">Sem copy salva — clique em ✏️ Editar e cole a copy do anúncio.</span>'}</div>
      <h4 class="om-sec">Links Úteis</h4>
      <div class="links-grid" style="grid-template-columns:1fr">
        ${linkTile("📘", "Página no Facebook", "Acompanhe a página e analise os posts e interações", o.fbPage)}
        ${linkTile("🌐", "Site do Anunciante", "Analise a página de destino e a experiência do funil", o.site)}
        ${linkTile("🎬", "Link do Melhor Criativo", "Veja o criativo principal utilizado nas campanhas", o.creative)}
        ${linkTile("📚", "Biblioteca de Anúncios", "Explore os anúncios ativos e históricos da oferta", libSearchUrl(o))}
      </div>
      ${o.notes ? `<h4 class="om-sec">Notas</h4><div class="om-desc">${escHtml(o.notes)}</div>` : ""}
    </div>
    <div>
      <h4 class="om-sec" style="margin-top:0">Informações</h4>
      <div class="info-grid" style="grid-template-columns:1fr 1fr">
        ${infoTile("Formato", escHtml(o.format || "—"))}
        ${infoTile("Status", st.label)}
        ${infoTile("Idioma", `${o.lang === "Português" ? "🇧🇷 " : ""}${escHtml(o.lang || "—")}`)}
        ${infoTile("Nicho", escHtml(nicheName))}
        ${infoTile("VSL", isVsl ? "Sim" : "Não")}
        ${infoTile("Anúncios", `<span class="grad-text">${o.ads ?? "—"}</span>`)}
        ${infoTile("Dias rodando", `🟢 ${libDays(o)}`)}
        ${infoTile("Ticket", o.price ? `<span style="color:var(--good)">R$ ${(+o.price).toFixed(2).replace(".", ",")}</span>` : "—")}
      </div>
      <div class="info-tile" style="margin-top:8px">
        <span class="it-lbl">Publicado em</span>
        <span class="it-val">${o.firstSeen ? o.firstSeen.split("-").reverse().join("/") : "—"}</span>
      </div>
    </div>
  </div>
  ${sameNiche.length ? `
    <h4 class="om-sec">Ofertas do mesmo nicho</h4>
    <div class="om-minis">
      ${sameNiche
        .map((x) => {
          const xt = x.img && typeof imgById === "function" ? imgById(x.img) : null;
          const xs = LIB_STATUS[x.status] || LIB_STATUS.observando;
          return `<button class="om-mini" data-lib-view="${x.i}">
            <span class="mm-emoji">${xt ? `<img src="${xt.dataUrl}" alt="" style="width:34px;height:34px;object-fit:cover;border-radius:8px" />` : emoji}</span>
            <strong>${escHtml(x.name)}</strong>
            <span>${xs.label} · ${x.ads ?? "?"} anúncios</span>
          </button>`;
        })
        .join("")}
    </div>` : ""}
  <div class="form-actions" style="margin-top:20px">
    <button class="btn btn-primary btn-sm" id="omModelBtn">✨ MODELAR OFERTA</button>
    <button class="btn btn-ghost btn-sm" data-lib-edit="${idx}" id="omEditBtn">✏️ Editar oferta</button>
    <button class="btn btn-ghost btn-sm" id="omCloseBtn">Fechar</button>
  </div>`;
  $("#offerModal").hidden = false;
  document.body.style.overflow = "hidden";
  $("#omCloseBtn").addEventListener("click", closeOfferModal);
  $("#omEditBtn").addEventListener("click", () => {
    closeOfferModal();
    libOpenForm(idx);
  });
  $("#omModelBtn").addEventListener("click", () => {
    closeOfferModal();
    if (window.startModelagem) window.startModelagem(idx);
  });
  $("#offerModalBody").querySelectorAll(".om-mini[data-lib-view]").forEach((b) =>
    b.addEventListener("click", () => openOfferModal(+b.dataset.libView))
  );
  $("#offerModalBody").querySelectorAll("[data-fb-shot]").forEach((im) =>
    im.addEventListener("click", () => { if (window.showCreativeViewer) window.showCreativeViewer(im.dataset.fbShot); })
  );
}
window.openOfferModal = openOfferModal;

function closeOfferModal() {
  $("#offerModal").hidden = true;
  document.body.style.overflow = "";
}
$("#offerModalClose").addEventListener("click", closeOfferModal);
$("#offerModal").addEventListener("click", (e) => {
  if (e.target === $("#offerModal")) closeOfferModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#offerModal").hidden) closeOfferModal();
});

$("#offerGrid").addEventListener("click", (e) => {
  const fav = e.target.closest("[data-lib-fav]");
  const edit = e.target.closest("[data-lib-edit]");
  const del = e.target.closest("[data-lib-del]");
  const view = e.target.closest("[data-lib-view]");
  if (view) return openOfferModal(+view.dataset.libView);
  if (fav) {
    const offers = loadOffers();
    offers[+fav.dataset.libFav].fav = !offers[+fav.dataset.libFav].fav;
    saveOffers(offers);
    renderLibrary();
  }
  if (edit) libOpenForm(+edit.dataset.libEdit);
  if (del) {
    const offers = loadOffers();
    if (!confirm(`Excluir a oferta "${offers[+del.dataset.libDel].name}"?\n`)) return;
    offers.splice(+del.dataset.libDel, 1);
    saveOffers(offers);
    renderLibrary();
  }
});

["libSearch", "libNicheFilter", "libStatusFilter"].forEach((id) => $("#" + id).addEventListener("input", renderLibrary));

$("#btnLibExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(loadOffers(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pulsarads-ofertas.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Biblioteca exportada ⬇️");
});

// ============================================================
// 🔥 BOOKMARKLET v5 — lê SÓ o modal de detalhes do anúncio
// FLUXO: 1) clique no anúncio (abre modal) 2) clique no bookmarklet
// ============================================================
const SITE_APP = "https://muhehehe123514-ux.github.io/pulsarads/app.html";

const BM_CODE = `(function(){try{
if(!/facebook\\.com/.test(location.hostname)){alert('Abra este botão dentro da Biblioteca de Anúncios do Facebook.');return;}

// PASSO 1: encontrar o MODAL de detalhes do anúncio
// Quando o usuário clica num anúncio, o FB abre um dialog/overlay
var modal = null;

// Tenta vários seletores de modal do FB
var modalSelectors = [
  '[role="dialog"]',
  '[aria-modal="true"]',
  '[data-testid="ad-library-details-modal"]',
  '[data-visualcompletion="ignore-dynamic"]'
];

for(var s=0; s<modalSelectors.length && !modal; s++){
  var candidates = document.querySelectorAll(modalSelectors[s]);
  for(var c=0; c<candidates.length; c++){
    var rect = candidates[c].getBoundingClientRect();
    // Modal válido: grande, visível, com bastante conteúdo
    if(rect.width > 500 && rect.height > 400 && candidates[c].innerText.length > 200){
      modal = candidates[c];
      break;
    }
  }
}

if(!modal){
  alert('⚠️ Não achei o modal de detalhes do anúncio.\\n\\n👉 PASSO CORRETO:\\n1. CLIQUE no anúncio na lista (abre os detalhes)\\n2. DEPOIS clique no bookmarklet 🪞');
  return;
}

// PASSO 2: extrair APENAS do modal
var T = modal.innerText || '';

// LIBRARY ID (número de 9+ dígitos)
var libId = (T.match(/(\\d{9,})/) || [])[1] || '';

// DATA DE INÍCIO - vários formatos
var started = '';
// PT-BR: "8 de mar de 2026", "15 de janeiro de 2026"
var ptDate = T.match(/(\\d{1,2})\\s+de\\s+([a-zç]{3,})\\s+de\\s+(\\d{4})/i);
var ptSlash = T.match(/(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})/);
if(ptDate) started = ptDate[1]+' de '+ptDate[2]+' de '+ptDate[3];
else if(ptSlash) started = ptSlash[1]+'/'+ptSlash[2]+'/'+ptSlash[3];
else {
  // EN: "March 8, 2026"
  var enMatch = T.match(/(?:started running on|iniciada em|ativo desde|começou a ser|veiculação iniciada em)\\s*([A-Z][a-z]+\\s+\\d{1,2},?\\s+\\d{4})/i);
  if(enMatch) started = enMatch[1];
}

// Nº DE ANÚNCIOS do anunciante
var adsMatch = T.match(/(\\d{1,4})\\s+(?:anúncios|ads|active ads|anúncios ativos)/i);
var ads = adsMatch ? parseInt(adsMatch[1].replace(/\\./g,'')) : null;

// TICKET REAL (R$ XX,XX)
var price = null;
var priceMatch = T.match(/R\\$\\s*(\\d{1,3}(?:[.,]\\d{1,2})?)/);
if(priceMatch){
  var valor = parseFloat(priceMatch[1].replace(',','.'));
  if(valor >= 1 && valor <= 9999) price = valor;
}

// IMAGENS (só do modal)
var imgEls = [].slice.call(modal.querySelectorAll('img'))
  .filter(function(im){ return /fbcdn|scontent/.test(im.currentSrc || im.src || ''); });
var cre = [], av = '';
imgEls.forEach(function(im){
  var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
  var s = im.currentSrc || im.src;
  if(w >= 180 || h >= 180) cre.push({u:s, a:w*h});
  else if(!av && Math.abs(w-h) < 16 && w >= 24 && w <= 140) av = s;
});
cre.sort(function(a,b){ return b.a - a.a; });
var U = [];
cre.forEach(function(c){ if(U.indexOf(c.u) < 0) U.push(c.u); });
U = U.slice(0, 8);
if(!av){
  var sm = imgEls.filter(function(im){ return (im.naturalWidth || im.width) <= 140; });
  if(sm[0]) av = sm[0].currentSrc || sm[0].src;
}

// VÍDEOS (só do modal)
var videoEls = [].slice.call(modal.querySelectorAll('video, video source'));
var V = [];
videoEls.forEach(function(v){
  var src = v.src || v.getAttribute('src') || '';
  if(src && V.indexOf(src) < 0) V.push(src);
});
V = V.slice(0, 3);

// PÁGINA DO ANUNCIANTE (link interno FB)
var page = '', pageUrl = '';
var L = [].slice.call(modal.querySelectorAll('a[href*="facebook.com/"]'));
for(var i=0; i<L.length; i++){
  var tx = (L[i].innerText || '').trim();
  // Pega o primeiro link com nome de página (não "ver mais", "patrocinado", etc)
  if(tx && tx.length > 1 && tx.length < 60 && !/^https?:/.test(tx) && 
     !/^(ver|see|all|todos|mais|more|sobre|about|patrocinado|sponsored|saiba mais|learn more|detalhes|details|sobre o anunciante|about the advertiser)$/i.test(tx)){
    page = tx;
    pageUrl = L[i].href.split('?')[0];
    break;
  }
}

// SITE EXTERNO (MAESDANOVAERA.COM, etc)
var site = '';
// Método 1: links "Saiba mais" com redirect do FB
var extLinks = [].slice.call(modal.querySelectorAll('a[href*="l.facebook.com/l.php"], a[href]:not([href*="facebook.com"])'));
for(var j=0; j<extLinks.length; j++){
  var href = extLinks[j].href || '';
  var u = href.match(/[?&]u=([^&]+)/);
  if(u) href = decodeURIComponent(u[1]);
  if(href && /^https?:\\/\\//.test(href) && !/facebook\\.com|fbcdn|scontent/.test(href)){
    site = href.split('?')[0];
    break;
  }
}
// Método 2: pega domínios em MAIÚSCULO no texto (ex: MAESDANOVAERA.COM)
if(!site){
  var domainMatch = T.match(/\\b([A-Z0-9][-A-Z0-9]*\\.[A-Z]{2,}(?:\\.[A-Z]{2,})?)\\b/);
  if(domainMatch && !/FACEBOOK|FB|INSTAGRAM/.test(domainMatch[1])){
    site = 'https://' + domainMatch[1].toLowerCase();
  }
}

// COPY COMPLETA DO ANÚNCIO
// Pega todos os blocos de texto longos do modal (não só o primeiro)
var textBlocks = [];
var D = [].slice.call(modal.querySelectorAll('div, span, p'));
for(var n=0; n<D.length; n++){
  if(D[n].childElementCount === 0){
    var t = (D[n].innerText || '').trim();
    // Bloco válido: texto longo, sem ser metadado
    if(t.length > 40 && t.length < 3000 && 
       !/library id|identifica\\S|started running|veicula\\S*iniciada|ativo desde|patrocinado|sponsored|detalhes do an|plataformas|sobre o anunc/i.test(t)){
      textBlocks.push(t);
    }
  }
}
// Junta os blocos, remove duplicatas (o FB repete muito texto)
var seen = {};
var uniqueBlocks = [];
textBlocks.forEach(function(b){
  // Normaliza pra detectar duplicatas
  var norm = b.replace(/\\s+/g,' ').slice(0, 100);
  if(!seen[norm]){
    seen[norm] = true;
    uniqueBlocks.push(b);
  }
});
var text = uniqueBlocks.join('\\n\\n');

// Se não achou blocos longos, tenta o maior bloco
if(!text){
  var longest = '';
  D.forEach(function(d){
    if(d.childElementCount === 0){
      var tx = (d.innerText || '').trim();
      if(tx.length > longest.length && tx.length < 2000 && !/library id|identifica/i.test(tx)){
        longest = tx;
      }
    }
  });
  text = longest;
}

// DETECÇÃO DE VSL
var hasVsl = V.length > 0 || /\\bvsl\\b|assista ao v[ií]deo|youtube\\.com|youtu\\.be|vimeo\\.com/i.test(text);

// STATUS, VERSÕES, CTA E DOMÍNIO EXIBIDO
var active = /\\bAtivo\\b|\\bActive\\b/.test(T.slice(0, 300)) && !/\\bInativo\\b|\\bInactive\\b/.test(T.slice(0, 300));
var multiV = /v[aá]rias vers[oõ]es|multiple versions/i.test(T);
var verM = T.match(/(\\d{1,3})\\s+an[uú]ncios usam/i);
var ctaM = T.match(/^(Saiba mais|Comprar agora|Cadastre-se|Enviar mensagem|Fale conosco|Ver mais|Baixar|Ligar agora|Obter oferta|Assinar|Reservar agora|Enviar mensagem pelo WhatsApp|Send WhatsApp|Send [Mm]essage|Learn [Mm]ore|Shop [Nn]ow|Sign [Uu]p|Download|Get [Oo]ffer|Contact [Uu]s)$/m);
var domM = T.match(/\\b([A-Z0-9][-A-Z0-9]*\\.[A-Z]{2,}(?:\\.[A-Z]{2,})?)\\b/);
var domain = (domM && !/FACEBOOK|INSTAGRAM|FBCDN/.test(domM[1])) ? domM[1] : '';

// NOME DO ANÚNCIO (primeira linha da copy ou nome da página)
var name = ((text.split('\\n')[0] || page || 'Oferta').trim()).slice(0, 90);

if(!U.length && !V.length && !page){
  alert('Não achei mídia nem anunciante neste modal. Tente clicar em outro anúncio.');
  return;
}

var data = {
  name: name,
  page: page, pageUrl: pageUrl, avatar: av,
  imgs: U, videos: V,
  text: text, started: started, libraryId: libId,
  ads: ads, site: site, price: price, hasVsl: hasVsl,
  active: active, multiV: multiV, versions: verM ? parseInt(verM[1]) : null,
  cta: ctaM ? ctaM[1] : '', domain: domain,
  libUrl: location.href,
  country: (location.href.match(/country=([A-Z]{2})/) || [])[1] || 'BR'
};

var enc = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
var w = window.open('${SITE_APP}#mirror=' + enc, '_blank');
if(!w){ prompt('Cole este link no PulsarAds:', '${SITE_APP}#mirror=' + enc); }
}catch(e){ alert('Espelhar PulsarAds: ' + e.message); }})()`;

$("#bookmarkletLink").setAttribute("href", "javascript:" + encodeURIComponent(BM_CODE));
$("#bookmarkletLink").addEventListener("click", (e) => {
  e.preventDefault();
  toast("Não clique aqui — ARRASTE este botão pra barra de favoritos 😉");
});

$("#btnLibPaste").addEventListener("click", () => {
  const raw = $("#libPaste").value.trim();
  if (!raw) return toast("Cole o link do espelhamento primeiro 🪞");
  const mm = raw.match(/#mirror=([^\s&]+)/);
  if (mm) { $("#libPaste").value = ""; location.hash = "#mirror=" + mm[1]; return; }
  if (/^[A-Za-z0-9+/=]{40,}$/.test(raw)) { $("#libPaste").value = ""; location.hash = "#mirror=" + raw; return; }
  let d;
  try { d = JSON.parse(raw); } catch { return toast("Cole o link que começa com …#mirror= (o botão gera pra você) 😕"); }
  const offers = loadOffers();
  const today = new Date().toISOString().slice(0, 10);
  const name = (d.q || d.name || "").trim() || "Pesquisa sem nome";
  const idx = offers.findIndex((o) => o.name.trim().toLowerCase() === name.toLowerCase());
  if (idx >= 0) {
    offers[idx].ads = d.ads ?? offers[idx].ads;
    offers[idx].lastChecked = d.when || today;
    if (d.url) offers[idx].url = d.url;
    toast(`Oferta "${name}" atualizada 📚\n`);
  } else {
    offers.push({
      name, advertiser: "", niche: -1, country: d.country || "BR",
      ads: d.ads ?? null, price: null, funnel: "Página de vendas direta",
      status: "observando", url: d.url || "", notes: "Importada via bookmarklet",
      firstSeen: d.when || today, lastChecked: d.when || today, fav: false,
    });
    toast(`Oferta "${name}" adicionada 📚\n`);
  }
  saveOffers(offers);
  $("#libPaste").value = "";
  renderLibrary();
});

window.libAddFromSearch = (q, url, country) => {
  const offers = loadOffers();
  const today = new Date().toISOString().slice(0, 10);
  let idx = offers.findIndex((o) => o.name.trim().toLowerCase() === q.trim().toLowerCase());
  if (idx < 0) {
    offers.push({
      name: q, advertiser: "", niche: -1, country: country || "BR", ads: null, price: null,
      funnel: "Página de vendas direta", status: "observando", url, notes: "Veio do Explorador",
      firstSeen: today, lastChecked: today, fav: false,
    });
    saveOffers(offers);
    idx = offers.length - 1;
    toast(`"${q}" adicionada à 📚 Biblioteca\n`);
  }
  renderLibrary();
  location.hash = "#biblioteca";
  openOfferModal(idx);
};

window.libAddOffer = (o) => {
  const offers = loadOffers();
  const today = new Date().toISOString().slice(0, 10);
  const name = (o.name || "").trim() || "Oferta sem nome";
  let idx = offers.findIndex((x) => x.name.trim().toLowerCase() === name.toLowerCase());
  const base = {
    name, advertiser: o.advertiser || "", niche: o.niche != null ? o.niche : -1, country: o.country || "BR",
    ads: o.ads ?? null, price: o.price ?? null, funnel: o.funnel || (o.hasVsl ? "VSL" : "Página de vendas direta"),
    status: o.status || "observando", format: o.format || "", lang: o.lang || "", desc: o.desc || "",
    fbPage: o.fbPage || "", site: o.site || "", creative: o.creative || (o.imgUrls && o.imgUrls[0]) || (o.videoUrls && o.videoUrls[0]) || "",
    url: o.libUrl || o.url || "", avatarUrl: o.avatarUrl || "",
    imgUrls: o.imgUrls || [], videoUrls: o.videoUrls || [], videoPosters: o.videoPosters || [],
    libraryId: o.libraryId || "", hasVsl: o.hasVsl || false,
    published: o.published || null,
    statusActive: o.statusActive !== false,
    platforms: o.platforms || [],
    versionsCount: o.versionsCount ?? null,
    multiVersions: !!o.multiVersions,
    cta: o.cta || "", domain: o.domain || "", headline: o.headline || "",
    libUrl: o.libUrl || "",
    notes: o.notes || (o._mirror ? "🪞 Espelhada da Biblioteca do Facebook" : ""),
    firstSeen: o.firstSeen || today, lastChecked: today, fav: false,
  };
  if (idx < 0) { offers.push(base); idx = offers.length - 1; }
  else {
    const cur = offers[idx];
    offers[idx] = { ...cur, ...base, fav: cur.fav, notes: cur.notes || base.notes, firstSeen: cur.firstSeen || base.firstSeen };
  }
  saveOffers(offers);
  renderLibrary();
  return idx;
};

renderLibrary();