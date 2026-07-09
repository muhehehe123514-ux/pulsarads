/* ============================================================
   PulsarAds — Biblioteca de Ofertas (dashboard de ofertas)
   Cards no estilo dashboard: chips, stats de anúncios/dias/ticket,
   favoritos e importação via bookmarklet da Ad Library.
   ============================================================ */

"use strict";

const LIB_KEY = "pulsar_offers";
const loadOffers = () => JSON.parse(localStorage.getItem(LIB_KEY) || "[]");
const saveOffers = (o) => localStorage.setItem(LIB_KEY, JSON.stringify(o));

const NICHE_EMOJI = ["🍰", "🧁", "🧶", "🐶", "💪", "🌿", "💄", "🧵", "👶", "📚", "🗣️", "🎸", "💰", "📈", "🧘", "🏡"];
const LIB_STATUS = {
  escalando: { label: "🔥 Escalando", cls: "chip-hot" },
  validando: { label: "🧪 Validando", cls: "chip-watch" },
  observando: { label: "👀 Observando", cls: "chip-watch" },
  morta: { label: "💀 Morreu", cls: "chip-dead" },
};

// ---------- selects ----------
$("#lfNiche").innerHTML =
  NICHES.map((n, i) => `<option value="${i}">${n.name}</option>`).join("") + `<option value="-1">Outro</option>`;
$("#libNicheFilter").innerHTML =
  `<option value="">Todos</option>` + NICHES.map((n, i) => `<option value="${i}">${n.name}</option>`).join("") + `<option value="-1">Outro</option>`;

// ---------- helpers ----------
const libDays = (o) => {
  if (!o.firstSeen) return 1;
  return Math.max(1, Math.round((Date.now() - new Date(o.firstSeen + "T12:00:00").getTime()) / 86400000));
};
const libSearchUrl = (o) =>
  o.url ||
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${o.country || "BR"}&q=${encodeURIComponent(o.name)}&search_type=keyword_unordered&media_type=all`;

// ---------- render ----------
function renderLibrary() {
  const offers = loadOffers();
  const q = $("#libSearch").value.trim().toLowerCase();
  const nicheF = $("#libNicheFilter").value;
  const statusF = $("#libStatusFilter").value;

  let list = offers.map((o, idx) => ({ ...o, idx }));
  if (q) list = list.filter((o) => `${o.name} ${o.advertiser} ${o.notes}`.toLowerCase().includes(q));
  if (nicheF !== "") list = list.filter((o) => String(o.niche) === nicheF);
  if (statusF) list = list.filter((o) => o.status === statusF);
  const rank = { escalando: 0, observando: 1, morta: 2 };
  list.sort((a, b) => (b.fav - a.fav) || (rank[a.status] - rank[b.status]) || (b.ads - a.ads));

  const grid = $("#offerGrid");
  if (!list.length) {
    grid.innerHTML = `<div class="viz-empty" style="grid-column:1/-1">${offers.length ? "Nenhuma oferta com esses filtros." : "Sua Biblioteca está vazia. Ela guarda <strong>só ofertas reais</strong>: garimpe na <a class=\"link-inline\" href=\"#ofertas\">🔥 Explorador de Ofertas</a> e clique em ➕ Biblioteca, importe pelo bookmarklet da biblioteca do Facebook, ou clique em ➕ Nova oferta pra cadastrar uma que você encontrou."}</div>`;
    return;
  }

  grid.innerHTML = list
    .map((o) => {
      const st = LIB_STATUS[o.status] || LIB_STATUS.observando;
      const emoji = o.niche >= 0 && NICHE_EMOJI[o.niche] ? NICHE_EMOJI[o.niche] : "🔥";
      const nicheName = o.niche >= 0 && NICHES[o.niche] ? NICHES[o.niche].name : "Outro";
      const isVsl = /vsl/i.test(o.funnel || "");
      const thumbUrl = o.avatarUrl || (o.imgUrls && o.imgUrls[0]) || (o.img && typeof imgById === "function" ? imgById(o.img)?.dataUrl : null);
      return `<article class="offer-card">
        <div class="oc-head">
          <div class="oc-avatar">${thumbUrl ? `<img src="${escHtml(thumbUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:11px" />` : emoji}</div>
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
        ${o.notes ? `<p class="oc-notes">${escHtml(o.notes)}</p>` : ""}
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
      </article>`;
    })
    .join("");
}

// ---------- form ----------
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

// ---------- modal "Ver Detalhes" (preview dentro do site) ----------
function infoTile(label, value) {
  return `<div class="info-tile"><span class="it-lbl">${label}</span><span class="it-val">${value}</span></div>`;
}
function linkTile(icon, title, desc, url) {
  const has = !!url;
  return `<a class="link-tile${has ? "" : " off"}" ${has ? `href="${escHtml(url)}" target="_blank" rel="noopener"` : ""}>
    <span class="lt-icon">${icon}</span>
    <span><strong>${title} ${has ? "↗" : ""}</strong><small>${has ? desc : "não cadastrado — edite a oferta pra adicionar"}</small></span>
  </a>`;
}

function openOfferModal(idx) {
  const offers = loadOffers();
  const o = offers[idx];
  if (!o) return;
  const st = LIB_STATUS[o.status] || LIB_STATUS.observando;
  const emoji = o.niche >= 0 && NICHE_EMOJI[o.niche] ? NICHE_EMOJI[o.niche] : "🔥";
  const nicheName = o.niche >= 0 && NICHES[o.niche] ? NICHES[o.niche].name : "Outro";
  const isVsl = /vsl/i.test(o.funnel || "");
  const avatarUrl = o.avatarUrl || (o.img && typeof imgById === "function" ? imgById(o.img)?.dataUrl : null);
  const galleryImgs = o.imgUrls && o.imgUrls.length ? o.imgUrls : (o.img && typeof imgById === "function" && imgById(o.img) ? [imgById(o.img).dataUrl] : []);

  // sugestões do mesmo nicho (excluindo a própria)
  const sameNiche = offers
    .map((x, i) => ({ ...x, i }))
    .filter((x) => x.i !== idx && x.niche === o.niche)
    .sort((a, b) => (b.ads || 0) - (a.ads || 0))
    .slice(0, 6);

  $("#offerModalBody").innerHTML = `
    <div class="om-head">
      <div class="oc-avatar big">${avatarUrl ? `<img src="${escHtml(avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:13px" />` : emoji}</div>
      <div>
        <h3>${escHtml(o.name)}</h3>
        <div class="oc-chips" style="margin-top:6px">
          <span class="chip">${escHtml(nicheName)}</span>
          <span class="chip">${escHtml((o.funnel || "").split(" ")[0] || "Funil")}</span>
          <span class="chip ${st.cls}">${st.label}</span>
        </div>
      </div>
    </div>
    ${galleryImgs.length ? `<div class="fb-carousel" style="margin-top:14px">${galleryImgs.map((u) => `<div class="fb-slide"><img src="${escHtml(u)}" alt="criativo" loading="lazy" data-fb-shot="${escHtml(u)}"></div>`).join("")}</div><div class="fb-count">🖼️ ${galleryImgs.length} criativo${galleryImgs.length > 1 ? "s" : ""} — clique pra ampliar/baixar</div>` : ""}

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
  // sugestões do mesmo nicho abrem o preview da outra oferta
  $("#offerModalBody").querySelectorAll(".om-mini[data-lib-view]").forEach((b) =>
    b.addEventListener("click", () => openOfferModal(+b.dataset.libView))
  );
  // clicar num criativo abre o visualizador (ampliar/baixar)
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

// ---------- ações dos cards ----------
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
    if (!confirm(`Excluir a oferta "${offers[+del.dataset.libDel].name}"?`)) return;
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

// ---------- bookmarklet "🪞 Espelhar anúncio" ----------
// Roda NA página do anúncio no Facebook, lê imagens/avatar/nome/texto/data
// e abre o PulsarAds com tudo no #mirror= (o js/mirror.js recebe e mostra).
const SITE_APP = "https://muhehehe123514-ux.github.io/pulsarads/app.html";
const BM_CODE = `(function(){try{
if(!/facebook\\.com/.test(location.hostname)){alert('Abra este bot\\u00e3o dentro da Biblioteca de An\\u00fancios do Facebook (facebook.com/ads/library).');return;}
var T=document.body.innerText||'';
var libId=(T.match(/(?:Library ID|Identifica\\u00e7\\u00e3o na biblioteca)[:\\s]*([0-9]{6,})/i)||[])[1]||'';
var started=(T.match(/(?:Started running on|Veicula\\u00e7\\u00e3o iniciada em|Ativo desde)\\s*([^\\n]{4,42})/i)||[])[1]||'';
var resN=(T.match(/~?\\s*([0-9\\.,]+)\\s*(?:results|resultados|an\\u00fancios)/i)||[])[1]||'';
var I=[].slice.call(document.images).filter(function(im){var s=im.currentSrc||im.src;return /fbcdn|scontent/.test(s)&&(im.naturalWidth||im.width)>0;});
var cre=[],av='';
I.forEach(function(im){var w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,s=im.currentSrc||im.src;if(w>=200||h>=200){cre.push({u:s,a:w*h});}else if(!av&&Math.abs(w-h)<14&&w>=24&&w<=130){av=s;}});
cre.sort(function(a,b){return b.a-a.a;});var U=[];cre.forEach(function(c){if(U.indexOf(c.u)<0)U.push(c.u);});U=U.slice(0,8);
if(!av){var sm=I.filter(function(im){return (im.naturalWidth||im.width)<=130;});if(sm[0])av=sm[0].currentSrc||sm[0].src;}
var page='',pageUrl='',L=[].slice.call(document.querySelectorAll('a[href*="facebook.com/"]'));
for(var i=0;i<L.length;i++){var tx=(L[i].innerText||'').trim();if(tx&&tx.length>1&&tx.length<60&&!/^https?:/.test(tx)&&!/^(ver|see|all|todos|sobre|about|mais|more)$/i.test(tx)){page=tx;pageUrl=L[i].href.split('?')[0];break;}}
var text='',D=[].slice.call(document.querySelectorAll('div,span,p'));
for(var j=0;j<D.length;j++){if(D[j].children.length===0){var t=(D[j].innerText||'').trim();if(t.length>text.length&&t.length>40&&t.length<1600&&!/Library ID|Identifica\\u00e7/i.test(t))text=t;}}
var data={name:((text.split('\\n')[0]||page||'Oferta').trim()).slice(0,80),page:page,pageUrl:pageUrl,avatar:av,imgs:U,text:text,started:started,libraryId:libId,ads:resN?parseInt(resN.replace(/[\\.,]/g,'')):null,libUrl:location.href,country:(location.href.match(/country=([A-Z]{2})/)||[])[1]||'BR'};
if(!U.length&&!page){alert('N\\u00e3o achei um an\\u00fancio nesta tela. Abra UM an\\u00fancio da Biblioteca de An\\u00fancios (clique nele) e espelhe de novo.');return;}
var enc=btoa(unescape(encodeURIComponent(JSON.stringify(data))));
var w=window.open('${SITE_APP}#mirror='+enc,'_blank');
if(!w){prompt('Cole este link no PulsarAds (campo Espelhar):','${SITE_APP}#mirror='+enc);}
}catch(e){alert('Espelhar PulsarAds: '+e.message);}})()`;
$("#bookmarkletLink").setAttribute("href", "javascript:" + encodeURIComponent(BM_CODE));
$("#bookmarkletLink").addEventListener("click", (e) => {
  e.preventDefault();
  toast("Não clique aqui — ARRASTE este botão pra barra de favoritos 😉");
});

$("#btnLibPaste").addEventListener("click", () => {
  const raw = $("#libPaste").value.trim();
  if (!raw) return toast("Cole o link do espelhamento primeiro 🪞");
  // link do espelhamento (…#mirror=…) → dispara o receptor
  const mm = raw.match(/#mirror=([^\s&]+)/);
  if (mm) { $("#libPaste").value = ""; location.hash = "#mirror=" + mm[1]; return; }
  // ou a string base64 crua do espelhamento
  if (/^[A-Za-z0-9+/=]{40,}$/.test(raw)) { $("#libPaste").value = ""; location.hash = "#mirror=" + raw; return; }
  // compatibilidade: JSON antigo do import
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
    toast(`Oferta "${name}" atualizada 📚`);
  } else {
    offers.push({
      name, advertiser: "", niche: -1, country: d.country || "BR",
      ads: d.ads ?? null, price: null, funnel: "Página de vendas direta",
      status: "observando", url: d.url || "", notes: "Importada via bookmarklet",
      firstSeen: d.when || today, lastChecked: d.when || today, fav: false,
    });
    toast(`Oferta "${name}" adicionada 📚`);
  }
  saveOffers(offers);
  $("#libPaste").value = "";
  renderLibrary();
});

// ---------- integração com o Explorador ----------
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
    toast(`"${q}" adicionada à 📚 Biblioteca`);
  }
  renderLibrary();
  // abre o preview da oferta direto no site
  location.hash = "#biblioteca";
  openOfferModal(idx);
};

// adiciona/atualiza uma OFERTA COMPLETA (com imagens reais espelhadas do Facebook)
// e devolve o índice. Dedupe por nome; mescla os dados novos nos já existentes.
window.libAddOffer = (o) => {
  const offers = loadOffers();
  const today = new Date().toISOString().slice(0, 10);
  const name = (o.name || "").trim() || "Oferta sem nome";
  let idx = offers.findIndex((x) => x.name.trim().toLowerCase() === name.toLowerCase());
  const base = {
    name, advertiser: o.advertiser || "", niche: o.niche != null ? o.niche : -1, country: o.country || "BR",
    ads: o.ads ?? null, price: o.price ?? null, funnel: o.funnel || (o.hasVsl ? "VSL" : "Página de vendas direta"),
    status: o.status || "observando", format: o.format || "", lang: o.lang || "", desc: o.desc || "",
    fbPage: o.fbPage || "", site: o.site || "", creative: o.creative || (o.imgUrls && o.imgUrls[0]) || "",
    url: o.libUrl || o.url || "", avatarUrl: o.avatarUrl || "", imgUrls: o.imgUrls || [],
    libraryId: o.libraryId || "", notes: o.notes || (o._mirror ? "🪞 Espelhada da Biblioteca do Facebook" : ""),
    firstSeen: o.firstSeen || today, lastChecked: today, fav: false,
  };
  if (idx < 0) { offers.push(base); idx = offers.length - 1; }
  else {
    // mescla: preserva favorito/nota do usuário, atualiza o que veio novo
    const cur = offers[idx];
    offers[idx] = { ...cur, ...base, fav: cur.fav, notes: cur.notes || base.notes, firstSeen: cur.firstSeen || base.firstSeen };
  }
  saveOffers(offers);
  renderLibrary();
  return idx;
};

// A Biblioteca guarda SÓ ofertas reais: mineradas da biblioteca do Facebook
// (bookmarklet/importação) ou adicionadas por você pelo Explorador. Sem seed.
renderLibrary();
