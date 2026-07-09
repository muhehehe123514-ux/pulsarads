/* ============================================================
   PulsarAds — Ferramentas 2.0
   Explorador de Ofertas · Rastreador de Vendas · UTMs Dinâmicas
   · Modelador Low Ticket (depende dos globals de app.js)
   ============================================================ */

"use strict";

// ============================================================
// 15) EXPLORADOR DE OFERTAS (Ad Library com filtros + fila)
// ============================================================
/* Palavras-chave 2.0 — frases que o VENDEDOR escreve na copy do anúncio.
   Pesquisar como o anunciante escreve (e não como o cliente pesquisa)
   é o que faz cair direto em oferta de low ticket rodando. */
const NICHES = [
  { name: "Culinária & receitas", kws: ["apostila de receitas", "receitas testadas e aprovadas", "50 receitas", "caderno de receitas digital", "receitas que vendem"] },
  { name: "Confeitaria & doces", kws: ["apostila de confeitaria", "precificação de doces", "doces para vender", "bolos que vendem todos os dias", "curso de confeitaria por apenas"] },
  { name: "Artesanato & manualidades", kws: ["moldes prontos para imprimir", "apostila de crochê", "receitas de amigurumi", "gráficos de crochê", "moldes em tamanho real"] },
  { name: "Pets", kws: ["guia de adestramento", "adestre seu cão em casa", "receitas naturais para cães", "manual do adestramento", "comandos de obediência pdf"] },
  { name: "Fitness em casa", kws: ["planilha de treino", "treinos prontos", "protocolo de treino", "desafio 30 dias por apenas", "treino em casa pdf"] },
  { name: "Bem-estar & rotina", kws: ["cardápio semanal pronto", "protocolo do sono", "guia prático de jejum", "método passo a passo", "plano alimentar pdf"] },
  { name: "Beleza & autocuidado", kws: ["apostila de unhas", "curso de sobrancelha por apenas", "cronograma capilar pdf", "curso de cílios", "técnicas profissionais apostila"] },
  { name: "Moda & costura", kws: ["moldes de costura prontos", "moldes para imprimir", "apostila de corte e costura", "moldes tamanho real pdf", "costure e venda"] },
  { name: "Maternidade & infantil", kws: ["atividades para imprimir", "kit de atividades", "apostila de alfabetização", "atividades montessori pdf", "kit escolar para imprimir"] },
  { name: "Educação & concursos", kws: ["mapas mentais prontos", "resumos prontos pdf", "apostila para concurso", "simulados com gabarito", "planner de estudos por apenas"] },
  { name: "Idiomas", kws: ["apostila de inglês", "inglês do zero pdf", "guia de conversação", "método de inglês por apenas", "inglês em 90 dias"] },
  { name: "Música", kws: ["apostila de violão", "método de teclado", "curso de violão por apenas", "cifras simplificadas pdf", "toque em 30 dias"] },
  { name: "Finanças pessoais", kws: ["planilha de controle financeiro", "kit de planilhas prontas", "planilha pronta por apenas", "método para sair das dívidas", "planilha de orçamento familiar"] },
  { name: "Marketing & negócios online", kws: ["pack de artes editáveis", "templates prontos canva", "kit instagram profissional", "artes prontas para postar", "curso de tráfego por apenas"] },
  { name: "Espiritualidade & fé", kws: ["plano de leitura da bíblia", "estudo bíblico pdf", "devocional por apenas", "kit cristão para imprimir", "leia a bíblia em 1 ano"] },
  { name: "Casa & jardinagem", kws: ["guia de suculentas", "checklist de limpeza para imprimir", "planner de organização", "guia prático de horta", "kit organização pdf"] },
];

// gatilhos que só aparecem em copy de quem está VENDENDO agora
const QUALIFIERS_AUTO = ["por apenas", "R$ 19,90", "R$ 27", "acesso imediato"];
const SAVED_KEY = "pulsar_saved_searches";
let opQueue = [];

const opNicheSel = $("#opNiche");
opNicheSel.innerHTML =
  NICHES.map((n, i) => `<option value="${i}">${n.name}</option>`).join("") +
  `<option value="custom">— Só a minha palavra-chave extra</option>`;

function adLibUrl(q) {
  const p = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country: $("#opCountry").value,
    q,
    search_type: "keyword_unordered",
    media_type: $("#opMedia").value,
  });
  const lang = $("#opLang").value;
  if (lang) p.set("content_languages[0]", lang);
  return "https://www.facebook.com/ads/library/?" + p.toString();
}

$("#btnOpGenerate").addEventListener("click", () => {
  const nicheVal = opNicheSel.value;
  const custom = $("#opCustomKw").value.trim();
  let kws = [];
  if (nicheVal === "custom") {
    if (!custom) return toast("Digite a palavra-chave extra primeiro 🔍");
    kws = [custom];
  } else {
    kws = [...NICHES[+nicheVal].kws];
    if (custom) kws.unshift(custom);
  }
  if (!window.canUse()) return;
  const qual = $("#opQualifier").value;
  const searches = [...kws];
  // combina a frase de vendedor com gatilho de preço/entrega (filtro sempre ativo)
  kws.slice(0, 4).forEach((k, i) => {
    const extra = qual || QUALIFIERS_AUTO[i % QUALIFIERS_AUTO.length];
    if (!k.toLowerCase().includes(extra.toLowerCase())) searches.push(`${k} ${extra}`);
  });
  const nicheIdx = nicheVal === "custom" ? -1 : +nicheVal;
  const cc = $("#opCountry").value;
  opQueue = searches.slice(0, 12).map((q) => ({ q, url: adLibUrl(q), opened: false, niche: nicheIdx, country: cc }));
  $("#opScanCard").hidden = false;
  renderOpQueue();
  toast(`${opQueue.length} pesquisas prontas 🔥`);
  $("#opScanCard").scrollIntoView({ behavior: "smooth", block: "start" });
  window.spendUse();
});

function renderOpQueue() {
  const done = opQueue.filter((s) => s.opened).length;
  $("#opScanProgress").textContent = opQueue.length ? `${done}/${opQueue.length} abertas` : "";
  const list = $("#opSearchList");
  list.className = "op-grid";
  const nicheVal = opNicheSel.value;
  const nicheName = nicheVal === "custom" ? "Personalizado" : NICHES[+nicheVal].name;
  const emoji = typeof NICHE_EMOJI !== "undefined" && nicheVal !== "custom" ? NICHE_EMOJI[+nicheVal] || "🔥" : "🔥";
  const offers = typeof loadOffers === "function" ? loadOffers() : [];
  const country = $("#opCountry").value;

  list.innerHTML = opQueue
    .map((s, i) => {
      // se essa pesquisa já virou oferta salva, mostra os dados reais dela
      const saved = offers.find((o) => o.name.trim().toLowerCase() === s.q.trim().toLowerCase());
      const img = saved?.img && typeof imgById === "function" ? imgById(saved.img) : null;
      const stats = saved
        ? `<div class="op-mini-stats"><span>👥 ${saved.ads ?? "?"} anúncios</span><span>💵 ${saved.price ? "R$ " + saved.price : "—"}</span><span>📚 salva</span></div>`
        : `<div class="op-mini-stats"><span>🔎 ativos agora</span><span>${country}</span><span>filtro de venda ON</span></div>`;
      return `<article class="op-card${s.opened ? " seen" : ""}">
        <div class="op-clickable" data-op-prev="${i}" title="Ver prévia da oferta">
          <div class="op-thumb">${img ? `<img src="${img.dataUrl}" alt="" />` : emoji}<span class="op-num">${s.opened ? "✅ vista" : "PESQUISA " + (i + 1)}</span></div>
          <div class="op-body">
            <strong>${escHtml(s.q)}</strong>
            <div class="oc-chips"><span class="chip">${escHtml(nicheName)}</span>${saved ? `<span class="chip chip-hot">📚 na Biblioteca</span>` : ""}</div>
            ${stats}
          </div>
        </div>
        <div class="op-actions">
          <button class="btn btn-primary btn-sm" data-op-prev="${i}">👁 Ver prévia</button>
          <button class="btn btn-ghost btn-sm" data-op-lib="${i}" title="Adicionar à Biblioteca">➕</button>
          <button class="btn btn-ghost btn-sm" data-op-save="${i}" title="Salvar pesquisa">💾</button>
        </div>
      </article>`;
    })
    .join("");
}

$("#btnOpNext").addEventListener("click", () => {
  const next = opQueue.find((s) => !s.opened);
  if (!next) return toast("Fila concluída! Gere outra bateria 🔥");
  next.opened = true;
  window.open(next.url, "_blank", "noopener");
  renderOpQueue();
});

$("#btnOpAll").addEventListener("click", () => {
  const rest = opQueue.filter((s) => !s.opened);
  if (!rest.length) return toast("Fila concluída! Gere outra bateria 🔥");
  toast("Abrindo todas… se só abrir 1, permita pop-ups pro site 🙏");
  rest.forEach((s) => {
    s.opened = true;
    window.open(s.url, "_blank", "noopener");
  });
  renderOpQueue();
});

$("#btnOpReset").addEventListener("click", () => {
  opQueue.forEach((s) => (s.opened = false));
  renderOpQueue();
});

$("#opSearchList").addEventListener("click", (e) => {
  const prev = e.target.closest("[data-op-prev]");
  const save = e.target.closest("[data-op-save]");
  const lib = e.target.closest("[data-op-lib]");
  if (lib && window.libAddFromSearch) {
    const s = opQueue[+lib.dataset.opLib];
    window.libAddFromSearch(s.q, s.url, s.country || $("#opCountry").value);
    return;
  }
  if (save) {
    const s = opQueue[+save.dataset.opSave];
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    saved.unshift({ q: s.q, url: s.url });
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved.slice(0, 30)));
    renderOpSaved();
    toast("Pesquisa salva 💾");
    return;
  }
  if (prev) openOpPreview(+prev.dataset.opPrev);
});

// ---------- Prévia estilo Biblioteca de Anúncios do Facebook ----------
// abre pelo Explorador (índice da fila)
function openOpPreview(i) {
  const s = opQueue[i];
  if (!s) return;
  const offers = typeof loadOffers === "function" ? loadOffers() : [];
  const saved = offers.find((o) => o.name.trim().toLowerCase() === s.q.trim().toLowerCase()) || null;
  const o = saved
    ? { ...saved, libUrl: s.url }
    : { name: s.q, niche: s.niche, country: s.country, libUrl: s.url, _live: true };
  renderPreviewModal(o, { onSeen: () => { s.opened = true; renderOpQueue(); } });
}

// renderizador genérico — aceita uma oferta com URLs de imagem REAIS
// (avatarUrl, imgUrls[]) vindas do espelhamento da Biblioteca do Facebook
function renderPreviewModal(o, ctx = {}) {
  const nicheIdx = (o.niche != null && o.niche >= 0) ? o.niche : -1;
  const nicheName = nicheIdx >= 0 && NICHES[nicheIdx] ? NICHES[nicheIdx].name : (o.nicheName || "—");
  const emoji = typeof NICHE_EMOJI !== "undefined" && nicheIdx >= 0 ? (NICHE_EMOJI[nicheIdx] || "🔥") : "🔥";
  const st = (typeof LIB_STATUS !== "undefined" && o.status && LIB_STATUS[o.status]) ? LIB_STATUS[o.status] : (o._live ? { label: "🔎 ativo agora", cls: "chip-watch" } : null);
  const country = o.country || "BR";
  const isVsl = o.hasVsl != null ? o.hasVsl : (o.funnel != null ? /vsl/i.test(o.funnel || "") : null);
  const libUrl = o.libUrl || o.url || (typeof adLibUrl === "function" ? adLibUrl(o.name) : "https://www.facebook.com/ads/library/");

  // imagens reais: URLs espelhadas ou imagem da galeria
  const imgs = [];
  if (o.imgUrls && o.imgUrls.length) imgs.push(...o.imgUrls);
  else if (o.img && typeof imgById === "function") { const r = imgById(o.img); if (r) imgs.push(r.dataUrl); }
  const carousel = imgs.length
    ? `<div class="fb-carousel">${imgs.map((u) => `<div class="fb-slide"><img src="${escHtml(u)}" alt="criativo do anúncio" loading="lazy" data-fb-shot="${escHtml(u)}"></div>`).join("")}</div>${imgs.length > 1 ? `<div class="fb-count">🖼️ ${imgs.length} criativos — arraste ↔ (clique pra ampliar/baixar)</div>` : `<div class="fb-count">clique pra ampliar/baixar</div>`}`
    : `<div class="fb-noimg">📷🎬 Sem imagem ainda.<br><span class="hint">Use o botão <strong>🪞 Espelhar anúncio</strong> na Biblioteca do Facebook pra trazer as fotos, o avatar e o nome reais pra cá.</span></div>`;

  const V = (val) => (val !== undefined && val !== null && val !== "" ? val : `<span class="fb-unk">ver na biblioteca ↗</span>`);
  const ticket = o.price ? "R$ " + (+o.price).toFixed(2).replace(".", ",") : null;
  const days = o.firstSeen ? Math.max(1, Math.round((Date.now() - new Date(o.firstSeen + "T12:00:00")) / 86400000)) + " dias" : (o.days || null);
  const published = o.firstSeen ? o.firstSeen.split("-").reverse().join("/") : (o.published || null);
  const avatarHtml = o.avatarUrl ? `<img src="${escHtml(o.avatarUrl)}" alt="anunciante">` : emoji;
  const linkTile = (label, href, icon) =>
    href ? `<a class="fb-link" href="${escHtml(href)}" target="_blank" rel="noopener">${icon} ${label} ↗</a>`
         : `<a class="fb-link" href="${escHtml(libUrl)}" target="_blank" rel="noopener">${icon} ${label} <span class="fb-unk">(na biblioteca)</span></a>`;
  const creative = o.creative || imgs[0] || "";

  const body = `<div class="modal fb-modal" role="dialog" aria-label="Prévia da oferta">
    <button class="modal-close" data-fb-close aria-label="Fechar">✕</button>
    <div class="fb-head">
      <div class="fb-avatar">${avatarHtml}</div>
      <div class="fb-adname">
        <strong>${escHtml(o.advertiser || "Anunciante")}</strong>
        <span>${escHtml(o.name || "")}</span>
      </div>
      ${st ? `<span class="chip ${st.cls}">${st.label}</span>` : `<span class="chip chip-watch">🔎 ativo agora</span>`}
    </div>
    <div class="fb-cols">
      <div class="fb-left">
        ${carousel}
        <div class="fb-links">
          ${linkTile("Página no Facebook", o.fbPage, "📘")}
          ${linkTile("Site do anunciante", o.site, "🌐")}
          <button class="fb-link" data-fb-creative="${escHtml(creative)}">🎬 Melhor criativo ${creative ? "" : '<span class="fb-unk">(espelhe / na biblioteca)</span>'}</button>
          <a class="fb-link primary" href="${escHtml(libUrl)}" target="_blank" rel="noopener" data-fb-lib>🔎 Ver anúncios reais na Biblioteca do Facebook ↗</a>
        </div>
      </div>
      <div class="fb-right">
        <h4>Descrição do anunciante</h4>
        <p class="fb-desc">${o.desc ? escHtml(o.desc) : `<span class="fb-unk">Espelhe o anúncio pra trazer a copy que o anunciante escreveu.</span>`}</p>
        <h4>Informações</h4>
        <div class="fb-tiles">
          <div><span>Status</span><b>${st ? st.label : "🔎 ativo agora"}</b></div>
          <div><span>Formato</span><b>${V(o.format)}</b></div>
          <div><span>Idioma</span><b>${V(o.lang)}</b></div>
          <div><span>Nicho</span><b>${escHtml(nicheName)}</b></div>
          <div><span>Tem VSL?</span><b>${isVsl === null ? '<span class="fb-unk">ver ↗</span>' : (isVsl ? "Sim ✅" : "Não")}</b></div>
          <div><span>Nº de anúncios</span><b>${V(o.ads)}</b></div>
          <div><span>Dias rodando</span><b>${V(days)}</b></div>
          <div><span>Ticket</span><b class="fb-ticket">${V(ticket)}</b></div>
          <div><span>País</span><b>${escHtml(country)}</b></div>
          <div><span>Publicado em</span><b>${V(published)}</b></div>
        </div>
      </div>
    </div>
    <div class="fb-foot">
      <button class="btn btn-primary btn-sm" data-fb-modelar>✨ Modelar esta oferta</button>
      <button class="btn btn-ghost btn-sm" data-fb-add>➕ Adicionar à Biblioteca</button>
      <button class="btn btn-ghost btn-sm" data-fb-close>Fechar</button>
    </div>
  </div>`;

  let modal = document.getElementById("opPreviewModal");
  if (modal) modal.remove();
  modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.id = "opPreviewModal";
  modal.innerHTML = body;
  document.body.appendChild(modal);

  // guarda a oferta na Biblioteca (retorna o índice) — reidrata se já existir
  const ensureInLibrary = () => (window.libAddOffer ? window.libAddOffer(o) : (window.libAddFromSearch && window.libAddFromSearch(o.name, libUrl, country), -1));

  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest("[data-fb-close]")) return modal.remove();
    if (e.target.closest("[data-fb-lib]")) { if (ctx.onSeen) ctx.onSeen(); return; }
    const shot = e.target.closest("[data-fb-shot]");
    if (shot) { showCreativeViewer(shot.dataset.fbShot); return; }
    const cre = e.target.closest("[data-fb-creative]");
    if (cre) { const url = cre.dataset.fbCreative; if (url) showCreativeViewer(url); else window.open(libUrl, "_blank", "noopener"); return; }
    const add = e.target.closest("[data-fb-add]");
    if (add) { const idx = ensureInLibrary(); modal.remove(); if (idx >= 0 && window.openOfferModal) { location.hash = "#biblioteca"; window.openOfferModal(idx); } return; }
    const mod = e.target.closest("[data-fb-modelar]");
    if (mod) { const idx = ensureInLibrary(); modal.remove(); if (idx >= 0 && window.startModelagem) window.startModelagem(idx); }
  });
}
window.renderPreviewModal = renderPreviewModal;

// visualizador do criativo na tela + botão de baixar
function showCreativeViewer(url) {
  let v = document.getElementById("creativeViewer");
  if (v) v.remove();
  v = document.createElement("div");
  v.className = "modal-backdrop";
  v.id = "creativeViewer";
  v.innerHTML = `<div class="modal" style="max-width:640px;text-align:center">
    <button class="modal-close" data-cv-close aria-label="Fechar">✕</button>
    <h3 style="margin:0 0 12px">Melhor criativo</h3>
    <img src="${escHtml(url)}" alt="criativo" style="max-width:100%;border-radius:12px;max-height:70vh" onerror="this.replaceWith(Object.assign(document.createElement('p'),{textContent:'Não consegui carregar — abra o link direto.',className:'hint'}))">
    <div class="form-actions" style="justify-content:center;margin-top:14px">
      <button class="btn btn-primary btn-sm" data-cv-dl>⬇ Baixar criativo</button>
      <a class="btn btn-ghost btn-sm" href="${escHtml(url)}" target="_blank" rel="noopener">Abrir original ↗</a>
      <button class="btn btn-ghost btn-sm" data-cv-close>Fechar</button>
    </div>
  </div>`;
  document.body.appendChild(v);
  v.addEventListener("click", async (e) => {
    if (e.target === v || e.target.closest("[data-cv-close]")) return v.remove();
    if (e.target.closest("[data-cv-dl]")) {
      try {
        const r = await fetch(url); const b = await r.blob();
        const a = document.createElement("a"); a.href = URL.createObjectURL(b);
        a.download = "criativo-" + Date.now() + (b.type.includes("png") ? ".png" : ".jpg");
        a.click(); URL.revokeObjectURL(a.href); toast("Criativo baixado 🎬");
      } catch { window.open(url, "_blank", "noopener"); }
    }
  });
}
window.openOpPreview = openOpPreview;

function renderOpSaved() {
  const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  $("#opSaved").innerHTML = saved.length
    ? saved
        .map(
          (s, i) => `<div class="out-item">
            <div><span class="out-tag">Salva ${i + 1}</span><div class="out-text">${escHtml(s.q)}</div></div>
            <div class="out-actions">
              <a class="btn-copy" href="${escHtml(s.url)}" target="_blank" rel="noopener">Abrir ↗</a>
              <button class="btn-copy" data-copy="${escHtml(s.url)}">Copiar link</button>
              <button class="btn-copy" data-op-del="${i}">✕</button>
            </div>
          </div>`
        )
        .join("")
    : `<p class="hint">Nenhuma pesquisa salva ainda. Gere uma bateria e clique em "Salvar".</p>`;
}
$("#opSaved").addEventListener("click", (e) => {
  const del = e.target.closest("[data-op-del]");
  if (!del) return;
  const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  saved.splice(+del.dataset.opDel, 1);
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  renderOpSaved();
});
renderOpSaved();

// ============================================================
// 16) RASTREADOR DE VENDAS (atribuição local estilo Utmify)
// ============================================================
function renderMetaAuto() {
  const body = $("#metaAutoBody");
  const snap = JSON.parse(localStorage.getItem("pulsar_meta_snapshot") || "null");
  if (!snap || !snap.campaigns?.length) {
    body.innerHTML = `<p class="hint">Conecte a conta do cliente em <a href="#meta" style="color:var(--cyan);font-weight:600">📡 Meta Ads ao vivo</a> — as vendas, o lucro e o ROAS passam a ser puxados automaticamente da API do Facebook e aparecem aqui.</p>`;
    return;
  }
  const cur = snap.currency || "BRL";
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur });
  const t = snap.campaigns.reduce(
    (a, c) => ({ spend: a.spend + (c.spend || 0), purch: a.purch + (c.purchases || 0), rev: a.rev + (c.revenue || 0) }),
    { spend: 0, purch: 0, rev: 0 }
  );
  const lucro = t.rev - t.spend;
  const when = new Date(snap.when);
  const top = [...snap.campaigns].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 6);
  body.innerHTML = `
    <div class="kpi-row">
      <div class="kpi-tile"><div class="kpi-lbl">Vendas</div><div class="kpi-val">${NUM.format(t.purch)}</div></div>
      <div class="kpi-tile"><div class="kpi-lbl">Receita</div><div class="kpi-val">${money.format(t.rev)}</div></div>
      <div class="kpi-tile"><div class="kpi-lbl">Gasto</div><div class="kpi-val">${money.format(t.spend)}</div></div>
      <div class="kpi-tile"><div class="kpi-lbl">Lucro</div><div class="kpi-val" style="color:${lucro >= 0 ? "var(--good)" : "var(--bad)"}">${money.format(lucro)}</div></div>
      <div class="kpi-tile"><div class="kpi-lbl">Ticket médio</div><div class="kpi-val">${t.purch ? money.format(t.rev / t.purch) : "—"}</div></div>
      <div class="kpi-tile"><div class="kpi-lbl">ROAS</div><div class="kpi-val">${t.spend > 0 && t.rev ? (t.rev / t.spend).toFixed(2) + "x" : "—"}</div></div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Campanha</th><th>Vendas</th><th>Receita</th><th>Gasto</th><th>Lucro</th><th>ROAS</th></tr></thead>
        <tbody>${top
          .map((c) => {
            const l = (c.revenue || 0) - (c.spend || 0);
            return `<tr><td>${escHtml(c.name)}</td><td>${c.purchases || 0}</td><td>${money.format(c.revenue || 0)}</td>
              <td>${money.format(c.spend || 0)}</td><td class="${l >= 0 ? "pos" : "neg"}">${money.format(l)}</td>
              <td>${c.spend > 0 && c.revenue ? ((c.revenue / c.spend).toFixed(2)) + "x" : "—"}</td></tr>`;
          })
          .join("")}</tbody>
      </table>
    </div>
    <p class="hint">Período: ${escHtml(snap.periodLabel)} · sincronizado ${when.toLocaleDateString("pt-BR")} às ${when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · fonte: pixel da Meta (API oficial)</p>`;
}

$("#btnMetaSync").addEventListener("click", async () => {
  if (localStorage.getItem("pulsar_fb_token") && window.fbLoadCampaigns) {
    toast("Sincronizando com o Facebook Ads… 📡");
    await window.fbLoadCampaigns();
    toast("Rastreador atualizado com dados do Meta ✅");
  } else {
    location.hash = "#meta";
    toast("Conecte a conta do Facebook primeiro 📡");
  }
});

function renderVendas() {
  renderMetaAuto();
}
renderVendas();

// ============================================================
// 17) UTMS DINÂMICAS (macros por plataforma)
// ============================================================
const MACROS = {
  meta: {
    suffix:
      "utm_source=FB&utm_medium=paid&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_term={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_placement={{placement}}",
    where: 'Onde colar: no nível do ANÚNCIO → seção "Rastreamento" → campo "Parâmetros de URL". Cole só o sufixo (sem "?").',
    rows: [
      ["{{campaign.name}}", "Nome da campanha"],
      ["{{campaign.id}}", "ID numérico da campanha"],
      ["{{adset.name}}", "Nome do conjunto de anúncios"],
      ["{{adset.id}}", "ID do conjunto"],
      ["{{ad.name}}", "Nome do anúncio (criativo)"],
      ["{{ad.id}}", "ID do anúncio"],
      ["{{placement}}", "Posicionamento (feed, stories, reels…)"],
      ["{{site_source_name}}", "Origem do clique (fb, ig, msg, an)"],
    ],
  },
  google: {
    suffix: "utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_term={keyword}&utm_content={creative}&utm_network={network}",
    where: 'Onde colar: Campanha → Configurações → "Opções de URL da campanha" → campo "Sufixo do URL final".',
    rows: [
      ["{campaignid}", "ID da campanha"],
      ["{adgroupid}", "ID do grupo de anúncios"],
      ["{creative}", "ID do anúncio (criativo)"],
      ["{keyword}", "Palavra-chave que ativou o anúncio"],
      ["{network}", "Rede (g=busca, d=display, ytv=YouTube)"],
      ["{device}", "Dispositivo (m=mobile, t=tablet, c=desktop)"],
      ["{matchtype}", "Tipo de correspondência (e, p, b)"],
    ],
  },
  tiktok: {
    suffix: "utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_NAME__&utm_term=__AID_NAME__&utm_content=__CID_NAME__&utm_placement=__PLACEMENT__",
    where: 'Onde colar: no anúncio → campo de URL de destino, anexado após o link com "?".',
    rows: [
      ["__CAMPAIGN_NAME__", "Nome da campanha"],
      ["__CAMPAIGN_ID__", "ID da campanha"],
      ["__AID_NAME__", "Nome do grupo de anúncios"],
      ["__AID__", "ID do grupo de anúncios"],
      ["__CID_NAME__", "Nome do anúncio (criativo)"],
      ["__CID__", "ID do anúncio"],
      ["__PLACEMENT__", "Posicionamento"],
    ],
  },
};

function renderMacros() {
  const m = MACROS[$("#mcPlatform").value];
  $("#mcSuffix").textContent = m.suffix;
  $("#mcWhere").textContent = m.where;
  $("#mcTable tbody").innerHTML = m.rows
    .map(([macro, desc]) => `<tr><td><span class="mc-macro">${escHtml(macro)}</span></td><td>${escHtml(desc)}</td></tr>`)
    .join("");
  $("#btnMcCopyUrl").hidden = !$("#mcUrl").value.trim();
}
$("#mcPlatform").addEventListener("change", renderMacros);
$("#mcUrl").addEventListener("input", renderMacros);
$("#btnMcCopySuffix").addEventListener("click", () => copyText(MACROS[$("#mcPlatform").value].suffix, "Sufixo copiado! 🎯"));
$("#btnMcCopyUrl").addEventListener("click", () => {
  const url = $("#mcUrl").value.trim().replace(/[?&]+$/, "");
  const sep = url.includes("?") ? "&" : "?";
  copyText(url + sep + MACROS[$("#mcPlatform").value].suffix, "URL completa copiada! 🎯");
});
renderMacros();

// ============================================================
// 18) MODELADOR LOW TICKET
// ============================================================
$("#ltNiche").innerHTML = NICHES.map((n, i) => `<option value="${i}">${n.name}</option>`).join("");

const LT_NAMES = ["Guia Prático", "Método Express", "Planner Completo", "Manual Definitivo", "Kit Turbo", "Desafio Relâmpago", "Protocolo", "Fórmula", "Blueprint", "Sistema"];
const LT_MECH = ["em 3 passos", "com o método dos 15 minutos", "sem complicação", "do zero ao resultado", "no piloto automático", "com checklist diário"];

$("#btnLtGenerate").addEventListener("click", () => {
  if (!window.canUse()) return;
  const niche = NICHES[+$("#ltNiche").value];
  const topic = $("#ltTopic").value.trim() || niche.kws[0];
  const format = $("#ltFormat").value;
  const price = parseFloat($("#ltPrice").value) || 27;
  const priceFmt = BRL.format(price);
  const anchor = BRL.format(price * 3);
  const mech = pick(LT_MECH);
  const offerName = `${pick(LT_NAMES)}: ${cap(topic)} ${mech}`;
  const bumpPrice = BRL.format(price <= 20 ? 9.9 : 12.9);
  const upsellPrice = BRL.format(price <= 27 ? 67 : 97);
  const downsell = BRL.format(Math.max(9.9, Math.round(price * 0.5)));
  const budget = Math.max(Math.round(price * 2), 30);
  const cpaAlvo = BRL.format(price * 0.6);
  const cpaLimite = BRL.format(price);

  const offer = `📦 A OFERTA (com mecanismo único)\n• Nome: ${offerName}\n• Formato: ${format} · Preço: ${priceFmt} (âncora: "de ${anchor} por ${priceFmt}")\n• Público: quem quer ${topic} mas trava por falta de um passo a passo claro\n• Promessa central: sair do zero e ter o primeiro resultado em ${topic} JÁ na primeira semana — ${mech}\n• Mecanismo (o "como" diferente): um caminho enxuto que corta 80% do que não importa e entrega só o que gera resultado\n• Prova: antes/depois, prints ou o próprio material aberto no criativo`;

  const adCopy = `[GANCHO] Você tenta ${topic} há meses e continua no mesmo lugar? O problema não é você — é falta de método.\n\n[AGITA] Vídeo solto, dica aqui e ali, e no fim sobra um monte de informação desconexa que não vira resultado. Cansa, né?\n\n[SOLUÇÃO] O ${offerName} é um ${format.toLowerCase()} direto ao ponto: o passo a passo ${mech}, pra aplicar hoje e ver resultado essa semana.\n\n✅ Acesso imediato (cai no seu e-mail em minutos)\n✅ Linguagem simples — feito pra quem começa do zero\n✅ Garantia de 7 dias: não gostou, devolvemos\n✅ Só ${priceFmt} (menos que uma pizza)\n\n👉 Toque em "Saiba mais" e comece ainda hoje.`;

  const headlines = `Teste estes 5 ângulos (1 por criativo):\n1. ${cap(topic)} ${mech}: o passo a passo completo por ${priceFmt}\n2. O erro nº 1 de quem tenta ${topic} sozinho (e como corrigir hoje)\n3. De ${anchor} por ${priceFmt}: ${topic} sem enrolação, com garantia\n4. Comece ${topic} hoje — acesso imediato, resultado essa semana\n5. ${cap(topic)} em 15 min/dia: o ${format.toLowerCase()} que descomplica de vez`;

  const funnel = `🛒 FUNIL DE VALOR (maximiza o ticket médio)\n1. Anúncio → página de vendas curta: promessa + 3 provas + oferta + garantia + botão\n2. Order bump no checkout (${bumpPrice}): complemento rápido — checklist, templates ou planilha (aceite 30–40%)\n3. Upsell 1 clique (${upsellPrice}): versão avançada / combo / mentoria gravada (aceite 10–20%)\n4. Downsell (${downsell}): recusou o upsell? Ofereça uma versão light\n5. Página de obrigado: entrega imediata + convite pro grupo/lista (dispara o pixel de Compra)\n🎯 Meta: bump + upsell pagam o tráfego → o produto principal vira lucro.`;

  const campaign = `🚀 CAMPANHA (Meta Ads)\n• Objetivo: Vendas · Otimização por Compra · CBO R$ ${budget}/dia\n• Conjunto 1: público aberto (só país + idioma + 18+) ← deixe o algoritmo achar\n• Conjunto 2: interesses ligados a "${niche.name}"\n• Conjunto 3: aberto com criativo em outro formato (ex.: UGC/depoimento)\n• 3–4 criativos por conjunto: misture imagem (🎨 Estúdio) + vídeo curto\n• Pixel obrigatório: ViewContent, InitiateCheckout, Purchase\n📏 Métricas-alvo: CPA até ${cpaAlvo} (bom) · corte acima de ${cpaLimite} · ROAS mínimo 1,8× no low ticket`;

  const scaleRules = `📈 REGRAS DE ESCALA (decida sem achismo)\n• Espere 3 dias antes de julgar um criativo\n• CPA abaixo de ${cpaAlvo}? Suba o orçamento 20% (nunca dobre de uma vez)\n• CPA acima de ${cpaLimite}? Pause o criativo/conjunto\n• Criativo vencedor: duplique num conjunto novo e teste lookalike de quem comprou\n• Antes de subir, simule o ganho no 📈 Simulador de Escala com os números reais da campanha`;

  const utm = `🎯 UTM PRONTA (cole em "Parâmetros de URL" do anúncio)\n${MACROS.meta.suffix}`;

  const checklist = `✅ CHECKLIST DE EXECUÇÃO\n1. Validar demanda no 🔥 Explorador de Ofertas (10+ anúncios ativos = demanda real)\n2. Criar o produto (${format.toLowerCase()}) focado em UMA transformação\n3. Escrever a página com a copy acima; passar no 🚦 Palavras Sensíveis\n4. Conferir títulos no 🔢 Contador de Caracteres\n5. Gerar criativos no 🎨 Estúdio + variações no ✍️ Headlines\n6. Instalar o pixel e fazer uma compra teste no checkout\n7. Colar a UTM dinâmica no anúncio\n8. Subir com ${budget}/dia → acompanhar no 💰 Rastreador → escalar o vencedor`;

  $("#ltOut").innerHTML = [
    [offer, "1 · A oferta"],
    [adCopy, "2 · Copy do anúncio (Gancho-Agita-Solução)"],
    [headlines, "3 · 5 ângulos de headline"],
    [funnel, "4 · Funil de valor"],
    [campaign, "5 · Campanha"],
    [scaleRules, "6 · Regras de escala"],
    [utm, "7 · Rastreamento"],
    [checklist, "8 · Checklist de execução"],
  ]
    .map(([t, tag], i) => outItem(t, tag, i))
    .join("");
  toast("Plano low ticket turbinado 🧭");
  window.spendUse();
});
