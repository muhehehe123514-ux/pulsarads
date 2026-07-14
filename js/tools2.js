/* ============================================================
PulsarAds — Ferramentas 2.0 (DEFINITIVO v3)
Explorador de Ofertas · Rastreador de Vendas · UTMs Dinâmicas
· Modelador Low Ticket · Preview Completo com Score de Validação
============================================================ */
"use strict";

// ============================================================
// 15) EXPLORADOR DE OFERTAS
// ============================================================
const NICHES = [
  { name: "Culinária & receitas", kws: ["apostila de receitas", "receitas testadas", "50 receitas", "caderno de receitas digital", "receitas que vendem"] },
  { name: "Confeitaria & doces", kws: ["apostila de confeitaria", "precificação de doces", "doces para vender", "bolos que vendem", "curso de confeitaria"] },
  { name: "Artesanato & manualidades", kws: ["moldes prontos", "apostila de crochê", "receitas de amigurumi", "gráficos de crochê", "moldes em tamanho real"] },
  { name: "Pets", kws: ["guia de adestramento", "adestre seu cão", "receitas naturais para cães", "manual do adestramento", "comandos de obediência"] },
  { name: "Fitness em casa", kws: ["planilha de treino", "treinos prontos", "protocolo de treino", "desafio 30 dias", "treino em casa"] },
  { name: "Bem-estar & rotina", kws: ["cardápio semanal", "protocolo do sono", "guia prático de jejum", "método passo a passo", "plano alimentar"] },
  { name: "Beleza & autocuidado", kws: ["apostila de unhas", "curso de sobrancelha", "cronograma capilar", "curso de cílios", "técnicas profissionais"] },
  { name: "Moda & costura", kws: ["moldes de costura", "moldes para imprimir", "apostila de corte e costura", "moldes tamanho real", "costure e venda"] },
  { name: "Maternidade & infantil", kws: ["atividades para imprimir", "kit de atividades", "apostila de alfabetização", "atividades montessori", "kit escolar"] },
  { name: "Educação & concursos", kws: ["mapas mentais", "resumos prontos", "apostila para concurso", "simulados com gabarito", "planner de estudos"] },
  { name: "Idiomas", kws: ["apostila de inglês", "inglês do zero", "guia de conversação", "método de inglês", "inglês em 90 dias"] },
  { name: "Música", kws: ["apostila de violão", "método de teclado", "curso de violão", "cifras simplificadas", "toque em 30 dias"] },
  { name: "Finanças pessoais", kws: ["planilha de controle financeiro", "kit de planilhas", "planilha pronta", "método para sair das dívidas", "planilha de orçamento"] },
  { name: "Marketing & negócios", kws: ["pack de artes", "templates prontos canva", "kit instagram", "artes prontas", "curso de tráfego"] },
  { name: "Espiritualidade & fé", kws: ["plano de leitura da bíblia", "estudo bíblico", "devocional", "kit cristão", "leia a bíblia em 1 ano"] },
  { name: "Casa & jardinagem", kws: ["guia de suculentas", "checklist de limpeza", "planner de organização", "guia prático de horta", "kit organização"] },
];

const QUALIFIERS_AUTO = ["por apenas", "R$ 19,90", "R$ 27", "acesso imediato"];
const SAVED_KEY = "pulsar_saved_searches";
let opQueue = [];
let opTotal = null; // "~120 resultados" vindo da Ad Library

const opNicheSel = $("#opNiche");
opNicheSel.innerHTML =
  NICHES.map((n, i) => `<option value="${i}">${n.name}</option>\n`).join("") +
  `<option value="custom">— Só a minha palavra-chave extra</option>\n`;

function adLibUrl(q) {
  const p = new URLSearchParams({
    active_status: "active", ad_type: "all",
    country: $("#opCountry").value, q,
    search_type: "keyword_unordered", media_type: $("#opMedia").value,
  });
  const lang = $("#opLang").value;
  if (lang) p.set("content_languages[0]", lang);
  return "https://www.facebook.com/ads/library/?" + p.toString();
}

function guessNicheIdx(text) {
  const t = (text || "").toLowerCase();
  let best = -1, score = 0;
  NICHES.forEach((n, i) => {
    let sc = 0;
    const seen = new Set();
    (n.kws || []).forEach((k) => {
      // qualquer palavra forte da keyword conta ("apostila de violão" → violão)
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

// ============================================================
// CONVERSOR: anúncio espelhado → oferta do preview (v3 corrigido)
// ============================================================
function adToOffer(a, cc) {
  const imgs = (a.imgs || []).filter(Boolean);
  const videos = (a.videos || []).filter((u) => u && /^https?:/i.test(u)); // blob: não toca fora do FB
  const posters = (a.posters || []).filter(Boolean);
  if (!videos.length && !imgs.length && posters.length) imgs.push(...posters);
  const creative = videos[0] || imgs[0] || "";
  const desc = a.text || "";

  // VSL: detecta por palavra-chave OU presença de vídeo
  const hasVsl = a.hasVsl || /\bvsl\b|assista|v[ií]deo|youtube|youtu\.be|vimeo|player/i.test(desc);

  // TICKET REAL: só aceita se já veio como número OU se tiver "R$" na copy
  let ticket = null;
  if (typeof a.price === "number" && !isNaN(a.price) && a.price > 0 && a.price < 10000) {
    ticket = a.price;
  } else {
    // Regex rigoroso: exige "R$" antes do número (evita pegar "5 receitas" como preço)
    const priceMatch = desc.match(/R\$\s*(\d{1,3}(?:[.,]\d{1,2})?)/);
    if (priceMatch) {
      const valor = parseFloat(priceMatch[1].replace(",", "."));
      if (valor >= 1 && valor <= 9999) ticket = valor;
    }
  }

  return {
    name: (a.name || a.headline || a.page || "Anúncio").slice(0, 90),
    advertiser: a.page || "",
    avatarUrl: a.avatar || "",
    imgUrls: imgs,
    videoUrls: videos,
    videoPosters: a.posters || [],
    creative,
    desc,
    fbPage: a.pageUrl || "",
    site: a.site || "",
    ads: (a.ads != null && !isNaN(a.ads)) ? a.ads : null,
    country: a.country || cc || "BR",
    lang: "Português",
    published: a.started || null,
    libraryId: a.libraryId || "",
    niche: guessNicheIdx((a.name || "") + " " + desc + " " + (a.page || "")),
    hasVsl,
    price: ticket,
    libUrl: a.libUrl || "",
    status: "escalando",
    statusActive: a.active !== false,
    platforms: a.platforms || [],
    versionsCount: a.versions || null,
    multiVersions: !!a.multiVersions,
    cta: a.cta || "",
    domain: a.domain || "",
    headline: a.headline || "",
    followers: a.followers || "",
    handles: a.handles || [],
    bio: a.bio || "",
    _mirror: true, _live: true,
  };
}

$("#btnOpGenerate").addEventListener("click", async () => {
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
  kws.slice(0, 4).forEach((k, i) => {
    const extra = qual || QUALIFIERS_AUTO[i % QUALIFIERS_AUTO.length];
    if (!k.toLowerCase().includes(extra.toLowerCase())) searches.push(`${k} ${extra}\n`);
  });
  const nicheIdx = nicheVal === "custom" ? -1 : +nicheVal;
  const cc = $("#opCountry").value;

  if (window.pulsarExtAvailable && window.pulsarExtAvailable()) {
    $("#opScanCard").hidden = false;
    $("#opScanProgress").textContent = "espelhando…";
    $("#opSearchList").className = "";
    $("#opSearchList").innerHTML = `<div class="op-loading">⚡ <strong>Skill de espelhamento ativa</strong> — abrindo a Biblioteca de Anúncios em segundo plano…<br><span class="hint">pode levar alguns segundos</span></div>\n`;
    $("#opScanCard").scrollIntoView({ behavior: "smooth", block: "start" });
    toast("⚡ Espelhando anúncios reais…");
    const ads = await window.pulsarExtSearch(searches.slice(0, 6), cc);
    if (ads && ads.length) {
      opTotal = ads._total || null;
      opQueue = ads.map((a) => ({ q: a.name, ad: adToOffer(a, cc), opened: false, niche: nicheIdx, country: cc }));
      renderOpQueue();
      toast(`🪞 ${ads.length} anúncios reais espelhados!`);
      window.spendUse();
      return;
    }
    toast("A skill não trouxe anúncios agora — mostrando o modo manual 👇");
  }

  opQueue = searches.slice(0, 12).map((q) => ({ q, url: adLibUrl(q), opened: false, niche: nicheIdx, country: cc }));
  $("#opScanCard").hidden = false;
  renderOpQueue();
  toast(`${opQueue.length} pesquisas prontas 🔥`);
  $("#opScanCard").scrollIntoView({ behavior: "smooth", block: "start" });
  window.spendUse();
});

function renderExtStatus() {
  const panel = document.getElementById("tool-ofertas");
  if (!panel) return;
  let el = document.getElementById("opExtStatus");
  if (!el) { el = document.createElement("div"); el.id = "opExtStatus"; const head = panel.querySelector(".panel-head"); head ? head.after(el) : panel.prepend(el); }
  if (window.pulsarExtAvailable && window.pulsarExtAvailable()) {
    el.className = "ext-status on";
    el.innerHTML = `⚡ <strong>Skill de espelhamento ativa</strong> — é só pesquisar que os anúncios reais (com imagens, ticket e dados) aparecem sozinhos.\n`;
  } else {
    el.className = "ext-status off";
    el.innerHTML = `💡 <strong>Quer no automático?</strong> Instale a extensão <strong>PulsarAds Espelho</strong> (1x) e a pesquisa traz os anúncios reais. <a href="https://github.com/muhehehe123514-ux/pulsarads/tree/main/extension" target="_blank" rel="noopener" class="link-inline">Como instalar ↗</a>\n`;
  }
}
document.addEventListener("pulsar-ext-ready", renderExtStatus);
setTimeout(renderExtStatus, 600);

// ============================================================
// 🪞 RENDERIZAÇÃO ESTILO BIBLIOTECA DE ANÚNCIOS DO FACEBOOK
// ============================================================
const PLAT_SVG = {
  facebook: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1877f2"/><path fill="#fff" d="M16.4 15.4l.5-3.4h-3.3V9.8c0-1 .5-1.9 2-1.9h1.5V5s-1.4-.24-2.7-.24c-2.7 0-4.5 1.64-4.5 4.64V12H7v3.4h2.9v8.4a12 12 0 0 0 3.7 0v-8.4h2.8z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="7" fill="#d62976"/><rect x="5.6" y="5.6" width="12.8" height="12.8" rx="4" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="16.4" cy="7.6" r="1.1" fill="#fff"/></svg>',
  audience_network: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#5f6673"/><path fill="#fff" d="M12 5.4l6.2 11.2H5.8z"/></svg>',
  messenger: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#0084ff"/><path fill="#fff" d="M12 5.6c-3.8 0-6.8 2.8-6.8 6.3 0 2 .96 3.7 2.5 4.9v2.4l2.3-1.3c.63.18 1.3.27 2 .27 3.8 0 6.8-2.8 6.8-6.3S15.8 5.6 12 5.6zm.75 8.5l-1.75-1.9-3.4 1.9 3.7-4 1.8 1.9 3.36-1.9-3.7 4z"/></svg>',
  threads: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#101010"/><text x="12" y="16.6" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="#fff">@</text></svg>',
  whatsapp: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#25d366"/><path fill="#fff" d="M17.1 14.6c-.28-.14-1.65-.8-1.9-.9-.26-.1-.45-.14-.63.14l-.87 1.06c-.16.18-.32.2-.6.07a7 7 0 0 1-3.5-3.06c-.26-.45.03-.53.2-.7l.5-.62c.14-.17.1-.36 0-.5l-.86-2.08c-.22-.53-.45-.45-.62-.46h-.53c-.18 0-.48.07-.73.36-.9 1-.97 2.4-.15 3.94a11.4 11.4 0 0 0 4.7 4.46c1.75.8 2.96.86 4 .4.53-.24 1.13-.86 1.28-1.5.14-.5.03-.55-.29-.61z"/></svg>',
};
const FBL_COUNTRIES = { BR: "Brasil", US: "Estados Unidos", PT: "Portugal", MX: "México", AR: "Argentina", ES: "Espanha", ALL: "Vários países" };

// "26 de mai de 2026" / "26 de maio de 2026" / "26/05/2026" → Date
const PT_MONTHS = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
function parsePtDate(p) {
  if (!p) return null;
  const m = String(p).match(/(\d{1,2})\s+de\s+([a-zç]{3,})\.?\s+de\s+(\d{4})/i);
  if (m) {
    const mo = PT_MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mo != null) return new Date(+m[3], mo, +m[1]);
  }
  const s = String(p).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (s) return new Date(+s[3], +s[2] - 1, +s[1]);
  const d = new Date(p);
  return isNaN(d.getTime()) ? null : d;
}

function fblPlatIcons(o) {
  const list = (o.platforms && o.platforms.length)
    ? o.platforms
    : ["facebook", "instagram", "audience_network", "messenger"];
  return `<span class="fbl-picons">${list.map((p) => PLAT_SVG[p] || "").join("")}</span>`;
}

// bloco superior do card: status · ID · data · plataformas · versões
function fblTopHtml(o, detailBtn = "") {
  const on = o.statusActive !== false;
  const rows = [
    `<span class="fbl-badge${on ? "" : " off"}"><span class="fbl-dot"></span>${on ? "Ativo" : "Inativo"}</span>`,
    `<div class="fbl-mrow">Identificação da biblioteca: ${escHtml(o.libraryId || "—")}</div>`,
  ];
  if (o.published) rows.push(`<div class="fbl-mrow">Veiculação iniciada em ${escHtml(o.published)}</div>`);
  rows.push(`<div class="fbl-mrow">Plataformas ${fblPlatIcons(o)}</div>`);
  if (o.versionsCount || o.multiVersions)
    rows.push(`<div class="fbl-mrow">${o.versionsCount ? `${o.versionsCount} anúncios usam esse criativo e esse texto` : "Esse anúncio tem várias versões"} <span class="fbl-info" title="O anunciante roda variações deste criativo — sinal de escala">ⓘ</span></div>`);
  return `<div class="fbl-top">${rows.join("")}${detailBtn}</div>`;
}

// mídia: no card mostra o 1º criativo (vídeo com poster + play, ou imagem)
function fblMediaHtml(o, full = false) {
  const imgs = o.imgUrls || [];
  const vids = o.videoUrls || [];
  const posters = o.videoPosters || [];
  if (full) {
    const items = [
      ...vids.map((u, i) => ({ type: "video", url: u, poster: posters[i] || "" })),
      ...imgs.map((u) => ({ type: "img", url: u })),
    ];
    if (!items.length) return `<div class="fbl-nomedia">📷🎬 Sem criativo capturado — abra na Biblioteca pra ver ao vivo.</div>`;
    return `<div class="fb-carousel fbl-carousel">${items.map((it) => it.type === "video"
      ? `<div class="fb-slide"><video src="${escHtml(it.url)}"${it.poster ? ` poster="${escHtml(it.poster)}"` : ""} controls playsinline preload="metadata"></video><button class="fb-dl-btn" data-fb-dl="${escHtml(it.url)}" title="Baixar">⬇</button></div>`
      : `<div class="fb-slide"><img src="${escHtml(it.url)}" alt="criativo" loading="lazy" data-fb-shot="${escHtml(it.url)}"><button class="fb-dl-btn" data-fb-dl="${escHtml(it.url)}" title="Baixar">⬇</button></div>`).join("")}</div>
      ${items.length > 1 ? `<div class="fbl-thumbs">${items.map((it, i) => {
        const src = it.type === "video" ? it.poster : it.url;
        return src ? `<img src="${escHtml(src)}" alt="" data-fbl-thumb="${i}"${it.type === "video" ? ' class="vid"' : ""}>` : `<span class="fbl-thumb-vid" data-fbl-thumb="${i}">▶</span>`;
      }).join("")}<span class="fbl-thumb-count">1 de ${items.length}</span></div>` : ""}`;
  }
  const v0 = vids[0], p0 = posters[0] || "";
  if (v0) return `<div class="fbl-media">${p0 ? `<img src="${escHtml(p0)}" alt="" loading="lazy">` : `<video src="${escHtml(v0)}" preload="metadata" muted playsinline></video>`}<span class="fbl-play">▶</span></div>`;
  if (imgs[0]) return `<div class="fbl-media"><img src="${escHtml(imgs[0])}" alt="" loading="lazy"></div>`;
  return "";
}

// corpo do anúncio: anunciante · copy · mídia · domínio/headline/CTA
function fblAdBoxHtml(o, { full = false, emoji = "🔥" } = {}) {
  const ava = o.avatarUrl ? `<img src="${escHtml(o.avatarUrl)}" alt="">` : `<span>${emoji}</span>`;
  const ctaLabel = escHtml(o.cta || "Saiba mais");
  const linkbar = (o.domain || o.cta || o.headline || o.site)
    ? `<div class="fbl-linkbar">
        <div class="fbl-linkinfo">
          ${o.domain ? `<span class="fbl-domain">${escHtml(o.domain)}</span>` : (o.site ? `<span class="fbl-domain">${escHtml(o.site.replace(/^https?:\/\//, "").split("/")[0].toUpperCase())}</span>` : "")}
          <strong class="fbl-headline">${escHtml(o.headline || o.name || "")}</strong>
        </div>
        ${o.site
          ? `<a class="fbl-ctabtn" href="${escHtml(o.site)}" target="_blank" rel="noopener" title="Abrir a página de destino do anúncio">${ctaLabel}</a>`
          : `<span class="fbl-ctabtn">${ctaLabel}</span>`}
      </div>` : "";
  return `<div class="fbl-adbox">
    <div class="fbl-adhead">
      <span class="fbl-ava">${ava}</span>
      <div class="fbl-who"><strong>${escHtml(o.advertiser || o.name || "Anunciante")}</strong><span>Patrocinado</span></div>
    </div>
    ${o.desc ? `<div class="fbl-copy${full ? " full" : ""}">${escHtml(o.desc)}</div>` : ""}
    ${fblMediaHtml(o, full)}
    ${linkbar}
  </div>`;
}

function renderOpQueue() {
  const done = opQueue.filter((s) => s.opened).length;
  const hasAds = opQueue.some((s) => s.ad);
  $("#opScanProgress").textContent = hasAds
    ? `🪞 ${opQueue.length} espelhados${opTotal ? ` · ${opTotal} resultados na Ad Library` : ""}`
    : (opQueue.length ? `${done}/${opQueue.length} abertas` : "");
  const list = $("#opSearchList");
  list.className = hasAds ? "fbl-grid" : "op-grid";
  const nicheVal = opNicheSel.value;
  const nicheName = nicheVal === "custom" ? "Personalizado" : NICHES[+nicheVal].name;
  const emoji = typeof NICHE_EMOJI !== "undefined" && nicheVal !== "custom" ? NICHE_EMOJI[+nicheVal] || "🔥" : "🔥";
  const offers = typeof loadOffers === "function" ? loadOffers() : [];
  const country = $("#opCountry").value;

  const header = hasAds
    ? `<div class="fbl-results">🪞 ${opQueue.length} anúncio${opQueue.length > 1 ? "s" : ""} real${opQueue.length > 1 ? "is" : ""} espelhado${opQueue.length > 1 ? "s" : ""}${opTotal ? ` · <span class="fbl-results-sub">${escHtml(opTotal)} resultados no Facebook</span>` : ""}</div>`
    : "";

  list.innerHTML = header + opQueue.map((s, i) => {
    if (s.ad) {
      const a = s.ad;
      return `<article class="fbl-card${s.opened ? " seen" : ""}">
        ${fblTopHtml(a, `<button class="fbl-btn" data-op-prev="${i}">Ver detalhes do anúncio</button>`)}
        <div class="fbl-click" data-op-prev="${i}" title="Ver detalhes do anúncio">
          ${fblAdBoxHtml(a, { emoji })}
        </div>
        <div class="fbl-acts">
          <button class="btn btn-ghost btn-sm" data-op-lib="${i}" title="Adicionar à Biblioteca">➕ Biblioteca</button>
          <button class="btn btn-primary btn-sm" data-op-model="${i}" title="Modelar esta oferta">✨ Modelar</button>
        </div>
      </article>\n`;
    }
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
          <div class="oc-chips">
            <span class="chip">${escHtml(nicheName)}</span>
            ${saved ? `<span class="chip chip-hot">📚 na Biblioteca</span>` : ""}
          </div>
          ${stats}
        </div>
      </div>
      <div class="op-actions">
        <button class="btn btn-primary btn-sm" data-op-prev="${i}">👁 Ver prévia</button>
        <button class="btn btn-ghost btn-sm" data-op-lib="${i}" title="Adicionar à Biblioteca">➕</button>
        <button class="btn btn-ghost btn-sm" data-op-save="${i}" title="Salvar pesquisa">💾</button>
      </div>
    </article>\n`;
  }).join("");
}

$("#btnOpNext").addEventListener("click", () => {
  const next = opQueue.find((s) => !s.opened);
  if (!next) return toast("Fila concluída! Gere outra bateria 🔥");
  next.opened = true;
  const url = next.url || (next.ad && next.ad.libUrl);
  if (url) window.open(url, "_blank", "noopener");
  renderOpQueue();
});

$("#btnOpAll").addEventListener("click", () => {
  const rest = opQueue.filter((s) => !s.opened);
  if (!rest.length) return toast("Fila concluída! Gere outra bateria 🔥");
  toast("Abrindo todas… se só abrir 1, permita pop-ups pro site 🙏");
  const seen = new Set();
  rest.forEach((s) => {
    s.opened = true;
    const url = s.url || (s.ad && s.ad.libUrl);
    if (url && !seen.has(url)) { seen.add(url); window.open(url, "_blank", "noopener"); }
  });
  renderOpQueue();
});

$("#btnOpReset").addEventListener("click", () => {
  opQueue.forEach((s) => (s.opened = false));
  renderOpQueue();
});

$("#opSearchList").addEventListener("click", (e) => {
  if (e.target.closest("a[href]")) return; // link real (CTA → página de destino): deixa navegar
  const prev = e.target.closest("[data-op-prev]");
  const save = e.target.closest("[data-op-save]");
  const lib = e.target.closest("[data-op-lib]");
  const model = e.target.closest("[data-op-model]");
  if (model) {
    const s = opQueue[+model.dataset.opModel];
    if (s && s.ad && window.libAddOffer) {
      const idx = window.libAddOffer(s.ad);
      if (window.startModelagem) window.startModelagem(idx);
    }
    return;
  }
  if (lib) {
    const s = opQueue[+lib.dataset.opLib];
    if (s.ad && window.libAddOffer) {
      const idx = window.libAddOffer(s.ad);
      location.hash = "#biblioteca";
      if (window.openOfferModal) window.openOfferModal(idx);
    } else if (window.libAddFromSearch) window.libAddFromSearch(s.q, s.url, s.country || $("#opCountry").value);
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

function openOpPreview(i) {
  const s = opQueue[i];
  if (!s) return;
  if (s.ad) {
    renderPreviewModal(s.ad, { onSeen: () => { s.opened = true; renderOpQueue(); } });
    return;
  }
  const offers = typeof loadOffers === "function" ? loadOffers() : [];
  const saved = offers.find((o) => o.name.trim().toLowerCase() === s.q.trim().toLowerCase()) || null;
  const o = saved ? { ...saved, libUrl: s.url } : { name: s.q, niche: s.niche, country: s.country, libUrl: s.url, _live: true };
  renderPreviewModal(o, { onSeen: () => { s.opened = true; renderOpQueue(); } });
}

// ============================================================
// VISUALIZADOR DE CRIATIVO (imagem OU vídeo) com download
// ============================================================
function showCreativeViewer(url) {
  let v = document.getElementById("creativeViewer");
  if (v) v.remove();
  v = document.createElement("div");
  v.className = "modal-backdrop";
  v.id = "creativeViewer";

  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url) || /video/.test(url);
  const mediaHtml = isVideo
    ? `<video src="${escHtml(url)}" controls autoplay playsinline style="max-width:100%;max-height:70vh;border-radius:12px;background:#000"></video>`
    : `<img src="${escHtml(url)}" alt="criativo" style="max-width:100%;border-radius:12px;max-height:70vh" onerror="this.replaceWith(Object.assign(document.createElement('p'),{textContent:'Não consegui carregar — abra o link direto.',className:'hint'}))">`;

  v.innerHTML = `<div class="modal" style="max-width:720px;text-align:center">
    <button class="modal-close" data-cv-close aria-label="Fechar">✕</button>
    <h3 style="margin:0 0 12px">🎬 Visualizador de criativo</h3>
    ${mediaHtml}
    <div class="form-actions" style="justify-content:center;margin-top:14px">
      <button class="btn btn-primary btn-sm" data-cv-dl>⬇ Baixar</button>
      <a class="btn btn-ghost btn-sm" href="${escHtml(url)}" target="_blank" rel="noopener">Abrir original ↗</a>
      <button class="btn btn-ghost btn-sm" data-cv-close>Fechar</button>
    </div>
  </div>`;
  document.body.appendChild(v);

  v.addEventListener("click", async (e) => {
    if (e.target === v || e.target.closest("[data-cv-close]")) return v.remove();
    if (e.target.closest("[data-cv-dl]")) {
      try {
        const r = await fetch(url);
        const b = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        const ext = isVideo ? (url.includes("webm") ? ".webm" : ".mp4") : (b.type.includes("png") ? ".png" : ".jpg");
        a.download = "pulsarads-criativo-" + Date.now() + ext;
        a.click();
        URL.revokeObjectURL(a.href);
        toast("Criativo baixado 🎬");
      } catch {
        window.open(url, "_blank", "noopener");
      }
    }
  });
}

// ============================================================
// PREVIEW COMPLETO DA OFERTA v2 (4 seções + score + downloads)
// ============================================================
function renderPreviewModal(o, ctx = {}) {
  const nicheIdx = (o.niche != null && o.niche >= 0) ? o.niche : -1;
  const nicheName = nicheIdx >= 0 && NICHES[nicheIdx] ? NICHES[nicheIdx].name : (o.nicheName || "—");
  const emoji = typeof NICHE_EMOJI !== "undefined" && nicheIdx >= 0 ? (NICHE_EMOJI[nicheIdx] || "🔥") : "🔥";
  const st = (typeof LIB_STATUS !== "undefined" && o.status && LIB_STATUS[o.status])
    ? LIB_STATUS[o.status]
    : (o._live ? { label: "🔎 ativo agora", cls: "chip-watch" } : null);
  const country = o.country || "BR";
  const isVsl = o.hasVsl != null ? o.hasVsl : (o.funnel != null ? /vsl/i.test(o.funnel || "") : null);
  const libUrl = o.libUrl || o.url || (typeof adLibUrl === "function" ? adLibUrl(o.name) : "https://www.facebook.com/ads/library/");

  const imgs = [];
  const videos = [];
  if (o.imgUrls && o.imgUrls.length) imgs.push(...o.imgUrls.filter(Boolean));
  if (o.videoUrls && o.videoUrls.length) videos.push(...o.videoUrls.filter((u) => u && /^https?:/i.test(u)));
  if (!videos.length && !imgs.length && o.videoPosters && o.videoPosters.length) imgs.push(...o.videoPosters.filter(Boolean));
  if (!imgs.length && !videos.length && o.img && typeof imgById === "function") {
    const r = imgById(o.img); if (r) imgs.push(r.dataUrl);
  }
  const galleryItems = [
    ...videos.map(u => ({ url: u, type: "video" })),
    ...imgs.map(u => ({ url: u, type: "img" })),
  ];
  // melhor criativo: o vídeo principal; sem vídeo, a maior imagem
  const bestCreative = videos[0] || imgs[0] || (o.creative && /^https?:/i.test(o.creative) ? o.creative : "");

  // dias rodando: a data REAL de veiculação do anúncio manda; firstSeen é só fallback
  let days = null;
  const pubDate = o.published ? parsePtDate(String(o.published).trim()) : null;
  if (pubDate) {
    days = Math.max(1, Math.round((Date.now() - pubDate.getTime()) / 86400000));
  } else if (o.firstSeen) {
    days = Math.max(1, Math.round((Date.now() - new Date(o.firstSeen + "T12:00:00").getTime()) / 86400000));
  }

  const published = o.published || (o.firstSeen ? o.firstSeen.split("-").reverse().join("/") : null);
  let priceVal = (o.price && !isNaN(o.price) && o.price > 0) ? +o.price : null;
  if (priceVal == null && o.desc) {
    // fallback: caça o preço na própria copy ("por apenas R$ 9,90", "apenas 27,00")
    const pm = o.desc.match(/R\$\s*(\d{1,3}(?:[.,]\d{1,2})?)/) ||
               o.desc.match(/(?:por\s+)?(?:apenas|somente|s[óo])\s+(\d{1,3}[.,]\d{2})/i);
    if (pm) { const v = parseFloat(pm[1].replace(",", ".")); if (v >= 1 && v <= 9999) priceVal = v; }
  }
  const ticket = priceVal != null ? "R$ " + priceVal.toFixed(2).replace(".", ",") : null;

  let score = 0;
  let scoreDetails = [];
  if (o.ads && o.ads >= 10) { score += 30; scoreDetails.push({ ok: true, text: `${o.ads}+ anúncios ativos` }); }
  else if (o.ads && o.ads >= 5) { score += 15; scoreDetails.push({ ok: true, text: `${o.ads} anúncios ativos` }); }
  else if (o.ads) { score += 5; scoreDetails.push({ ok: false, text: `apenas ${o.ads} anúncios` }); }
  else { scoreDetails.push({ ok: null, text: "nº de anúncios não detectado" }); }

  if (days && days >= 14) { score += 30; scoreDetails.push({ ok: true, text: `rodando há ${days} dias` }); }
  else if (days && days >= 7) { score += 20; scoreDetails.push({ ok: true, text: `rodando há ${days} dias` }); }
  else if (days && days >= 3) { score += 10; scoreDetails.push({ ok: null, text: `apenas ${days} dias` }); }
  else if (days) { score += 0; scoreDetails.push({ ok: false, text: `só ${days} dias` }); }
  else { scoreDetails.push({ ok: null, text: "dias rodando não detectado" }); }

  if (galleryItems.length >= 3) { score += 20; scoreDetails.push({ ok: true, text: `${galleryItems.length} variações de criativo` }); }
  else if (galleryItems.length >= 1) { score += 10; scoreDetails.push({ ok: null, text: `${galleryItems.length} criativo${galleryItems.length > 1 ? "s" : ""}` }); }

  if (ticket) {
    const val = parseFloat(ticket.replace(/[^\d,]/g, "").replace(",", "."));
    if (val <= 97) { score += 20; scoreDetails.push({ ok: true, text: `ticket baixo (${ticket})` }); }
    else { score += 5; scoreDetails.push({ ok: null, text: `ticket ${ticket}` }); }
  } else {
    scoreDetails.push({ ok: null, text: "ticket não detectado" });
  }

  const scoreLabel = score >= 70 ? "🔥 OFERTA FORTE" : score >= 40 ? "👀 VALE OLHAR" : "🧪 EM TESTE";
  const scoreColor = score >= 70 ? "var(--good)" : score >= 40 ? "#f59e0b" : "var(--muted)";

  const allAdsUrl = o.advertiser
    ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&publisher_platforms[0]=facebook&q=${encodeURIComponent(o.advertiser)}&search_type=keyword_unordered`
    : libUrl;

  const countryName = FBL_COUNTRIES[(country || "BR").toUpperCase()] || country;
  const advName = o.advertiser || o.name || "Anunciante";
  const oNorm = { ...o, imgUrls: imgs, videoUrls: videos, published: published || o.published };

  const body = `<div class="modal fbl-modal" role="dialog" aria-label="Detalhes do anúncio">
    <div class="fbl-mhead">
      <h3>Detalhes do anúncio</h3>
      <span class="fbl-mscore" style="color:${scoreColor}">${scoreLabel} · ${score}/100</span>
      <button class="modal-close" data-fb-close aria-label="Fechar">✕</button>
    </div>

    <div class="fbl-mgrid">
      <div class="fbl-mleft">
        ${fblTopHtml(oNorm)}
        ${fblAdBoxHtml(oNorm, { full: true, emoji })}
      </div>

      <div class="fbl-mright">
        <section class="fbl-sec">
          <h4>Sobre o rótulo</h4>
          <p class="fbl-note">Com base na localização e na categoria do anúncio, os anunciantes podem optar por divulgar ou ser obrigados a divulgar informações sobre si mesmos ou sobre o próprio anúncio.</p>
          <div class="fbl-rrow"><span class="fbl-ric">🌐</span><div><span>Localização</span><b>${escHtml(countryName)}</b></div></div>
          <div class="fbl-rrow"><span class="fbl-ric">👤</span><div><span>Anunciante</span><b>${escHtml(advName)}</b></div></div>
          <div class="fbl-rrow"><span class="fbl-ric">👤</span><div><span>Pagador</span><b>${escHtml(advName)}</b></div></div>
        </section>

        <section class="fbl-sec">
          <h4>Sobre o anunciante</h4>
          <div class="fbl-advrow">
            <span class="fbl-ava big">${o.avatarUrl ? `<img src="${escHtml(o.avatarUrl)}" alt="">` : `<span>${emoji}</span>`}</span>
            <div>
              <b>${escHtml(advName)}</b>
              ${(o.handles && o.handles.length) ? `<span class="fbl-subtle">${o.handles.map((h) => "@" + escHtml(h)).join(" · ")}</span>` : ""}
              ${o.followers ? `<span class="fbl-subtle">${escHtml(o.followers)} seguidores</span>` : ""}
              ${o.libraryId ? `<span class="fbl-subtle">Identificação da biblioteca: ${escHtml(o.libraryId)}</span>` : ""}
            </div>
          </div>
          ${o.bio ? `<p class="fbl-note" style="margin:0 0 12px"><strong style="display:block;color:#050505;margin-bottom:2px">Mais informações</strong>${escHtml(o.bio)}</p>` : ""}
          <div class="fbl-alinks">
            ${bestCreative ? `<button type="button" data-fb-best="${escHtml(bestCreative)}">🎬 Ver melhor criativo (${videos.length ? "vídeo" : "imagem"})</button>` : ""}
            ${o.site ? `<a href="${escHtml(o.site)}" target="_blank" rel="noopener">🌐 Página de vendas / VSL do anunciante ↗</a>` : ""}
            ${o.fbPage ? `<a href="${escHtml(o.fbPage)}" target="_blank" rel="noopener">📘 Página no Facebook ↗</a>` : ""}
            <a href="${escHtml(allAdsUrl)}" target="_blank" rel="noopener">🔎 Ver TODOS os anúncios deste anunciante ↗</a>
            <a href="${escHtml(libUrl)}" target="_blank" rel="noopener">📚 Abrir na Biblioteca de Anúncios ↗</a>
          </div>
        </section>

        <section class="fbl-sec pulsar">
          <h4>📊 Análise PulsarAds</h4>
          <div class="fb-tiles">
            <div><span>Status</span><b>${st ? st.label : "🔎 ativo agora"}</b></div>
            <div><span>Nicho</span><b>${escHtml(nicheName)}</b></div>
            <div><span>Idioma</span><b>${o.lang || "—"}</b></div>
            <div><span>País</span><b>${escHtml(country)}</b></div>
            <div><span>Tem VSL?</span><b>${isVsl === null ? '<span class="fb-unk">ver ↗</span>' : (isVsl ? "Sim ✅" : "Não")}</b></div>
            <div><span>Ticket</span><b class="fb-ticket">${ticket || '<span class="fb-unk">não detectado</span>'}</b></div>
            <div><span>Publicado em</span><b>${published || '<span class="fb-unk">—</span>'}</b></div>
            <div><span>Dias rodando</span><b>${days ? `🟢 ${days} dias` : '<span class="fb-unk">—</span>'}</b></div>
            <div><span>Nº de anúncios</span><b>${o.ads != null ? o.ads : '<span class="fb-unk">ver ↗</span>'}</b></div>
            <div><span>Criativos</span><b>${galleryItems.length || '<span class="fb-unk">—</span>'}</b></div>
          </div>

          <div class="fb-score-box" style="margin-top:12px">
            <div class="fb-score-big" style="color:${scoreColor}">${score}<small>/100</small></div>
            <ul class="fb-score-list">
              ${scoreDetails.map(d => `
                <li class="${d.ok === true ? "ok" : d.ok === false ? "bad" : "warn"}">
                  <span>${d.ok === true ? "✓" : d.ok === false ? "✕" : "?"}</span>
                  ${escHtml(d.text)}
                </li>`).join("")}
            </ul>
            <p class="hint" style="margin-top:10px">
              ${score >= 70
                ? "Oferta validada: muitos anúncios ativos há semanas = está lucrando."
                : score >= 40
                ? "Oferta em teste: alguns sinais positivos, vale acompanhar."
                : "Oferta muito recente ou sem dados suficientes. Acompanhe antes de modelar."}
            </p>
          </div>
        </section>
      </div>
    </div>

    <div class="fb-foot">
      <button class="btn btn-primary btn-sm" data-fb-modelar>✨ Modelar esta oferta</button>
      ${ctx.libraryIdx != null
        ? `<button class="btn btn-ghost btn-sm" data-fb-edit>✏️ Editar oferta</button>`
        : `<button class="btn btn-ghost btn-sm" data-fb-add>➕ Adicionar à Biblioteca</button>`}
      ${o.desc ? `<button class="btn btn-ghost btn-sm" data-copy="${escHtml(o.desc)}">⧉ Copiar copy</button>` : ""}
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

  const ensureInLibrary = () => (window.libAddOffer ? window.libAddOffer(o) : (window.libAddFromSearch && window.libAddFromSearch(o.name, libUrl, country), -1));

  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest("[data-fb-close]")) return modal.remove();
    if (e.target.closest("[data-fb-lib]")) { if (ctx.onSeen) ctx.onSeen(); return; }

    const best = e.target.closest("[data-fb-best]");
    if (best) { showCreativeViewer(best.dataset.fbBest); return; }

    const thumb = e.target.closest("[data-fbl-thumb]");
    if (thumb) {
      const car = modal.querySelector(".fbl-carousel");
      const idx = +thumb.dataset.fblThumb;
      if (car) car.scrollTo({ left: car.clientWidth * idx, behavior: "smooth" });
      modal.querySelectorAll("[data-fbl-thumb]").forEach((t) => t.classList.toggle("cur", t === thumb));
      const count = modal.querySelector(".fbl-thumb-count");
      if (count) count.textContent = `${idx + 1} de ${modal.querySelectorAll("[data-fbl-thumb]").length}`;
      return;
    }

    const edit = e.target.closest("[data-fb-edit]");
    if (edit) {
      modal.remove();
      if (ctx.libraryIdx != null && window.libOpenForm) {
        location.hash = "#biblioteca";
        window.libOpenForm(ctx.libraryIdx);
      }
      return;
    }

    const shot = e.target.closest("[data-fb-shot]");
    if (shot && e.target.tagName !== "BUTTON") { showCreativeViewer(shot.dataset.fbShot); return; }

    const dl = e.target.closest("[data-fb-dl]");
    if (dl) {
      e.stopPropagation();
      const url = dl.dataset.fbDl;
      (async () => {
        try {
          const r = await fetch(url); const b = await r.blob();
          const a = document.createElement("a"); a.href = URL.createObjectURL(b);
          const isVideo = /\.(mp4|webm|mov)/i.test(url);
          const ext = isVideo ? (url.includes("webm") ? ".webm" : ".mp4") : (b.type.includes("png") ? ".png" : ".jpg");
          a.download = "pulsarads-criativo-" + Date.now() + ext;
          a.click(); URL.revokeObjectURL(a.href); toast("Criativo baixado 🎬");
        } catch { window.open(url, "_blank", "noopener"); }
      })();
      return;
    }

    const copy = e.target.closest("[data-copy]");
    if (copy) { copyText(copy.dataset.copy, "Descrição copiada 📋"); return; }

    const add = e.target.closest("[data-fb-add]");
    if (add) {
      const idx = ensureInLibrary();
      modal.remove();
      if (idx >= 0 && window.openOfferModal) {
        location.hash = "#biblioteca";
        window.openOfferModal(idx);
      }
      return;
    }

    const mod = e.target.closest("[data-fb-modelar]");
    if (mod) {
      const idx = ensureInLibrary();
      modal.remove();
      if (idx >= 0 && window.startModelagem) window.startModelagem(idx);
    }
  });

  if (ctx.onSeen) ctx.onSeen();
}
window.renderPreviewModal = renderPreviewModal;
window.showCreativeViewer = showCreativeViewer;
window.openOpPreview = openOpPreview;

function renderOpSaved() {
  const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  $("#opSaved").innerHTML = saved.length
    ? saved.map((s, i) => `<div class="out-item">
        <div><span class="out-tag">Salva ${i + 1}</span><div class="out-text">${escHtml(s.q)}</div></div>
        <div class="out-actions">
          <a class="btn-copy" href="${escHtml(s.url)}" target="_blank" rel="noopener">Abrir ↗</a>
          <button class="btn-copy" data-copy="${escHtml(s.url)}">Copiar link</button>
          <button class="btn-copy" data-op-del="${i}">✕</button>
        </div>
      </div>`).join("")
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
// 16) RASTREADOR DE VENDAS
// ============================================================
function renderMetaAuto() {
  const body = $("#metaAutoBody");
  const snap = JSON.parse(localStorage.getItem("pulsar_meta_snapshot") || "null");
  if (!snap || !snap.campaigns?.length) {
    body.innerHTML = `<p class="hint">Conecte a conta do cliente em <a href="#meta" style="color:var(--cyan);font-weight:600">📡 Meta Ads ao vivo</a> — as vendas, o lucro e o ROAS passam a ser puxados automaticamente.</p>`;
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
  body.innerHTML = `<div class="kpi-row">
    <div class="kpi-tile"><div class="kpi-lbl">Vendas</div><div class="kpi-val">${NUM.format(t.purch)}</div></div>
    <div class="kpi-tile"><div class="kpi-lbl">Receita</div><div class="kpi-val">${money.format(t.rev)}</div></div>
    <div class="kpi-tile"><div class="kpi-lbl">Gasto</div><div class="kpi-val">${money.format(t.spend)}</div></div>
    <div class="kpi-tile"><div class="kpi-lbl">Lucro</div><div class="kpi-val" style="color:${lucro >= 0 ? "var(--good)" : "var(--bad)"}">${money.format(lucro)}</div></div>
    <div class="kpi-tile"><div class="kpi-lbl">Ticket médio</div><div class="kpi-val">${t.purch ? money.format(t.rev / t.purch) : "—"}</div></div>
    <div class="kpi-tile"><div class="kpi-lbl">ROAS</div><div class="kpi-val">${t.spend > 0 && t.rev ? (t.rev / t.spend).toFixed(2) + "x" : "—"}</div></div>
  </div>
  <div class="table-wrap"><table class="data-table">
    <thead><tr><th>Campanha</th><th>Vendas</th><th>Receita</th><th>Gasto</th><th>Lucro</th><th>ROAS</th></tr></thead>
    <tbody>${top.map((c) => {
      const l = (c.revenue || 0) - (c.spend || 0);
      return `<tr>
        <td>${escHtml(c.name)}</td>
        <td>${c.purchases || 0}</td>
        <td>${money.format(c.revenue || 0)}</td>
        <td>${money.format(c.spend || 0)}</td>
        <td class="${l >= 0 ? "pos" : "neg"}">${money.format(l)}</td>
        <td>${c.spend > 0 && c.revenue ? ((c.revenue / c.spend).toFixed(2)) + "x" : "—"}</td>
      </tr>`;
    }).join("")}</tbody>
  </table></div>
  <p class="hint">Período: ${escHtml(snap.periodLabel)} · sincronizado ${when.toLocaleDateString("pt-BR")} às ${when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>`;
}

$("#btnMetaSync").addEventListener("click", async () => {
  if (localStorage.getItem("pulsar_fb_token") && window.fbLoadCampaigns) {
    toast("Sincronizando com o Facebook Ads… 📡");
    await window.fbLoadCampaigns();
    toast("Rastreador atualizado ✅");
  } else {
    location.hash = "#meta";
    toast("Conecte a conta do Facebook primeiro 📡");
  }
});

function renderVendas() { renderMetaAuto(); }
window.renderVendas = renderVendas;
renderVendas();

// ============================================================
// 17) UTMS DINÂMICAS
// ============================================================
const MACROS = {
  meta: {
    suffix: "utm_source=FB&utm_medium=paid&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_term={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_placement={{placement}}",
    where: 'Onde colar: no nível do ANÚNCIO → seção "Rastreamento" → campo "Parâmetros de URL".',
    rows: [
      ["{{campaign.name}}", "Nome da campanha"], ["{{campaign.id}}", "ID da campanha"],
      ["{{adset.name}}", "Nome do conjunto"], ["{{adset.id}}", "ID do conjunto"],
      ["{{ad.name}}", "Nome do anúncio"], ["{{ad.id}}", "ID do anúncio"],
      ["{{placement}}", "Posicionamento"], ["{{site_source_name}}", "Origem do clique"],
    ],
  },
  google: {
    suffix: "utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_term={keyword}&utm_content={creative}&utm_network={network}",
    where: 'Onde colar: Campanha → Configurações → campo "Sufixo do URL final".',
    rows: [
      ["{campaignid}", "ID da campanha"], ["{adgroupid}", "ID do grupo"],
      ["{creative}", "ID do anúncio"], ["{keyword}", "Palavra-chave"],
      ["{network}", "Rede"], ["{device}", "Dispositivo"], ["{matchtype}", "Correspondência"],
    ],
  },
  tiktok: {
    suffix: "utm_source=tiktok&utm_medium=paid&utm_campaign=CAMPAIGN_NAME&utm_term=AID_NAME&utm_content=CID_NAME&utm_placement=PLACEMENT",
    where: 'Onde colar: no anúncio → campo de URL de destino, anexado após o link com "?".',
    rows: [
      ["CAMPAIGN_NAME", "Nome da campanha"], ["CAMPAIGN_ID", "ID da campanha"],
      ["AID_NAME", "Nome do grupo"], ["AID", "ID do grupo"],
      ["CID_NAME", "Nome do anúncio"], ["CID", "ID do anúncio"], ["PLACEMENT", "Posicionamento"],
    ],
  },
};

function renderMacros() {
  const m = MACROS[$("#mcPlatform").value];
  $("#mcSuffix").textContent = m.suffix;
  $("#mcWhere").textContent = m.where;
  $("#mcTable tbody").innerHTML = m.rows
    .map(([macro, desc]) => `<tr><td><span class="mc-macro">${escHtml(macro)}</span></td><td>${escHtml(desc)}</td></tr>`).join("");
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
  const offer = `📦 A OFERTA (com mecanismo único)\n• Nome: ${offerName}\n• Formato: ${format} · Preço: ${priceFmt}\n• Público: quem quer ${topic} mas trava por falta de um passo a passo claro\n• Promessa central: sair do zero e ter o primeiro resultado em ${topic} JÁ na primeira semana\n• Mecanismo: um caminho enxuto que corta 80% do que não importa\n• Prova: antes/depois, prints ou o próprio material aberto no criativo`;
  const adCopy = `[GANCHO] Você tenta ${topic} há meses e continua no mesmo lugar?\n\n[AGITA] Vídeo solto, dica aqui e ali, e no fim sobra um monte de informação desconexa.\n\n[SOLUÇÃO] O ${offerName} é um ${format.toLowerCase()} direto ao ponto: o passo a passo ${mech}.\n\n✅ Acesso imediato\n✅ Garantia de 7 dias\n✅ Só ${priceFmt}\n\n👉 Toque em "Saiba mais" e comece ainda hoje.`;
  const headlines = `Teste estes 5 ângulos:\n1. ${cap(topic)} ${mech}: o passo a passo completo por ${priceFmt}\n2. O erro nº 1 de quem tenta ${topic} sozinho\n3. De ${anchor} por ${priceFmt}: ${topic} sem enrolação\n4. Comece ${topic} hoje — acesso imediato\n5. ${cap(topic)} em 15 min/dia`;
  const funnel = `🛒 FUNIL DE VALOR\n1. Anúncio → página de vendas curta\n2. Order bump (${bumpPrice}): complemento rápido\n3. Upsell 1 clique (${upsellPrice}): versão avançada\n4. Downsell (${downsell}): versão light\n5. Página de obrigado: entrega imediata`;
  const campaign = `🚀 CAMPANHA (Meta Ads)\n• Objetivo: Vendas · CBO R$ ${budget}/dia\n• Conjunto 1: público aberto\n• Conjunto 2: interesses em "${niche.name}"\n• 3–4 criativos por conjunto\n• Pixel: ViewContent, InitiateCheckout, Purchase\n📏 CPA até ${cpaAlvo} (bom) · corte acima de ${cpaLimite}`;
  const scaleRules = `📈 REGRAS DE ESCALA\n• Espere 3 dias antes de julgar\n• CPA abaixo de ${cpaAlvo}? Suba 20%\n• CPA acima de ${cpaLimite}? Pause\n• Antes de subir, simule no 📈 Simulador`;
  const utm = `🎯 UTM PRONTA\n${MACROS.meta.suffix}`;
  const checklist = `✅ CHECKLIST\n1. Validar demanda no 🔥 Explorador (10+ anúncios ativos)\n2. Criar o produto\n3. Escrever a página\n4. Conferir títulos no 🔢 Contador\n5. Gerar criativos no 🎨 Estúdio\n6. Instalar o pixel\n7. Colar a UTM\n8. Subir com ${budget}/dia`;
  $("#ltOut").innerHTML = [
    [offer, "1 · A oferta"], [adCopy, "2 · Copy do anúncio"], [headlines, "3 · Headlines"],
    [funnel, "4 · Funil de valor"], [campaign, "5 · Campanha"], [scaleRules, "6 · Regras de escala"],
    [utm, "7 · Rastreamento"], [checklist, "8 · Checklist"],
  ].map(([t, tag], i) => outItem(t, tag, i)).join("");

  // guarda o plano pra gerar a página de vendas com 1 clique
  window.__ltPlan = {
    name: offerName,
    price,
    niche: +$("#ltNiche").value,
    headline: offerName,
    sub: `Saia do zero e tenha o primeiro resultado em ${topic} já na primeira semana — ${format.toLowerCase()} completo por ${priceFmt}, com acesso imediato e garantia de 7 dias.`,
  };
  $("#ltOut").insertAdjacentHTML("beforeend", `<div class="out-item">
    <div><span class="out-tag">9 · Página de vendas</span>
    <div class="out-text">Transforme este plano numa página de vendas PRONTA: editável (textos, fotos, seções), com paletas de cores, fontes e publicação grátis no Netlify.</div></div>
    <div class="out-actions"><button class="btn btn-primary btn-sm" data-lt-page>🚀 Criar página de vendas</button></div>
  </div>`);

  toast("Plano low ticket turbinado 🧭");
  window.spendUse();
});

$("#ltOut").addEventListener("click", (e) => {
  if (!e.target.closest("[data-lt-page]")) return;
  if (window.ltBuildSalesPage && window.__ltPlan) window.ltBuildSalesPage(window.__ltPlan);
  else toast("Gere o plano primeiro 🧭");
});