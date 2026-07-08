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

const SAMPLE_OFFERS = [
  { name: "Bolo no Pote Lucrativo", advertiser: "Doces & Lucro", niche: 0, country: "BR", ads: 34, price: 19.9, funnel: "Página de vendas direta", status: "escalando", format: "X1 Low Ticket", lang: "Português", desc: "🍰 Aprenda a fazer bolos no pote que vendem todos os dias. Kit completo com 50 receitas testadas, tabela de preços e embalagens. Comece hoje com menos de R$ 50 de investimento!", fbPage: "", site: "", creative: "", url: "", notes: "(exemplo) Promessa de renda com doces; order bump de embalagens.", firstSeen: "2026-06-12", lastChecked: "2026-07-06", fav: true },
  { name: "Crochê que Vende", advertiser: "Ateliê Criativo", niche: 2, country: "BR", ads: 21, price: 27, funnel: "VSL", status: "validando", format: "X1 Low Ticket", lang: "Português", desc: "🧶 100 receitas de crochê pra transformar seu hobby em renda extra. Passo a passo em vídeo, tamanhos variados e bônus incríveis. Sem complicação, sem enrolação!", fbPage: "", site: "", creative: "", url: "", notes: "(exemplo) VSL curta com depoimentos; upsell de receitas premium.", firstSeen: "2026-06-20", lastChecked: "2026-07-05", fav: false },
  { name: "Adestramento Express", advertiser: "Mundo Pet", niche: 3, country: "BR", ads: 12, price: 37, funnel: "Quiz", status: "observando", format: "Curso online", lang: "Português", desc: "🐶 Seu cão te obedecendo em 21 dias, sem gritar e sem petisco. Método usado por adestradores profissionais, agora acessível pra qualquer tutor.", fbPage: "", site: "", creative: "", url: "", notes: "(exemplo) Quiz de comportamento antes do checkout.", firstSeen: "2026-06-28", lastChecked: "2026-07-04", fav: false },
  { name: "Planner Sair das Dívidas", advertiser: "Finanças Leves", niche: 12, country: "BR", ads: 8, price: 19.9, funnel: "Página de vendas direta", status: "observando", format: "Ebook", lang: "Português", desc: "💰 O planner que já ajudou milhares de famílias a organizarem as contas. Imprima, preencha e veja pra onde vai cada real do seu salário.", fbPage: "", site: "", creative: "", url: "", notes: "(exemplo) Criativo de planilha em vídeo; público 30+.", firstSeen: "2026-07-01", lastChecked: "2026-07-06", fav: false },
  { name: "Inglês em 90 Dias", advertiser: "Fluência Rápida", niche: 10, country: "BR", ads: 3, price: 47, funnel: "VSL", status: "morta", format: "Curso online", lang: "Português", desc: "🗣️ Do zero à conversação em 90 dias com 15 minutos por dia.", fbPage: "", site: "", creative: "", url: "", notes: "(exemplo) Caiu de 25 pra 3 anúncios em duas semanas.", firstSeen: "2026-05-30", lastChecked: "2026-07-02", fav: false },
];

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
    grid.innerHTML = `<div class="viz-empty" style="grid-column:1/-1">Nenhuma oferta ${offers.length ? "com esses filtros" : "ainda — clique em ➕ Nova oferta ou Carregar exemplo"}.</div>`;
    return;
  }

  grid.innerHTML = list
    .map((o) => {
      const st = LIB_STATUS[o.status] || LIB_STATUS.observando;
      const emoji = o.niche >= 0 && NICHE_EMOJI[o.niche] ? NICHE_EMOJI[o.niche] : "🔥";
      const nicheName = o.niche >= 0 && NICHES[o.niche] ? NICHES[o.niche].name : "Outro";
      const isVsl = /vsl/i.test(o.funnel || "");
      const thumb = o.img && typeof imgById === "function" ? imgById(o.img) : null;
      return `<article class="offer-card">
        <div class="oc-head">
          <div class="oc-avatar">${thumb ? `<img src="${thumb.dataUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:11px" />` : emoji}</div>
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
  const thumb = o.img && typeof imgById === "function" ? imgById(o.img) : null;

  // sugestões do mesmo nicho (excluindo a própria)
  const sameNiche = offers
    .map((x, i) => ({ ...x, i }))
    .filter((x) => x.i !== idx && x.niche === o.niche)
    .sort((a, b) => (b.ads || 0) - (a.ads || 0))
    .slice(0, 6);

  $("#offerModalBody").innerHTML = `
    <div class="om-head">
      <div class="oc-avatar big">${thumb ? `<img src="${thumb.dataUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:13px" />` : emoji}</div>
      <div>
        <h3>${escHtml(o.name)}</h3>
        <div class="oc-chips" style="margin-top:6px">
          <span class="chip">${escHtml(nicheName)}</span>
          <span class="chip">${escHtml((o.funnel || "").split(" ")[0] || "Funil")}</span>
          <span class="chip ${st.cls}">${st.label}</span>
        </div>
      </div>
    </div>

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

$("#btnLibSample").addEventListener("click", () => {
  saveOffers(SAMPLE_OFFERS);
  renderLibrary();
  toast("Ofertas de exemplo carregadas ✨ (troque pelas suas garimpadas!)");
});

$("#btnLibExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(loadOffers(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pulsarads-ofertas.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Biblioteca exportada ⬇️");
});

// ---------- bookmarklet ----------
const BM_CODE = `(()=>{try{const p=new URLSearchParams(location.search);const d={q:p.get('q')||'',country:p.get('country')||'BR',ads:(document.body.innerText.match(/Library ID|Identifica\\u00e7\\u00e3o na biblioteca/gi)||[]).length,url:location.href,when:new Date().toISOString().slice(0,10)};const s=JSON.stringify(d);(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(s):Promise.reject()).then(()=>alert('PulsarAds: dados copiados! Cole na Biblioteca de Ofertas. ('+d.ads+' an\\u00fancios vis\\u00edveis)')).catch(()=>prompt('Copie manualmente:',s));}catch(e){alert('Pulsar Import: '+e)}})()`;
$("#bookmarkletLink").setAttribute("href", "javascript:" + encodeURIComponent(BM_CODE));
$("#bookmarkletLink").addEventListener("click", (e) => {
  e.preventDefault();
  toast("Não clique — ARRASTE este botão pra barra de favoritos 😉");
});

$("#btnLibPaste").addEventListener("click", () => {
  const raw = $("#libPaste").value.trim();
  if (!raw) return toast("Cole o texto do bookmarklet primeiro 📥");
  let d;
  try { d = JSON.parse(raw); } catch { return toast("Não reconheci esse texto — cole exatamente o que o bookmarklet copiou 😕"); }
  const offers = loadOffers();
  const today = new Date().toISOString().slice(0, 10);
  const name = (d.q || "").trim() || "Pesquisa sem nome";
  const idx = offers.findIndex((o) => o.name.trim().toLowerCase() === name.toLowerCase());
  if (idx >= 0) {
    offers[idx].ads = d.ads ?? offers[idx].ads;
    offers[idx].lastChecked = d.when || today;
    if (d.url) offers[idx].url = d.url;
    toast(`Oferta "${name}" atualizada: ${d.ads} anúncios visíveis 📚`);
  } else {
    offers.push({
      name, advertiser: "", niche: -1, country: d.country || "BR",
      ads: d.ads ?? null, price: null, funnel: "Página de vendas direta",
      status: "observando", url: d.url || "", notes: "Importada via bookmarklet",
      firstSeen: d.when || today, lastChecked: d.when || today, fav: false,
    });
    toast(`Oferta "${name}" adicionada com ${d.ads} anúncios 📚`);
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

// primeira visita: a Biblioteca ja chega populada com ofertas de exemplo
if (localStorage.getItem(LIB_KEY) === null) saveOffers(SAMPLE_OFFERS);
renderLibrary();
