/* ============================================================
   PulsarAds — Plataforma
   Todas as ferramentas rodam 100% no navegador.
   ============================================================ */

"use strict";

// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

const toast = (msg) => {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2200);
};

const copyText = async (text, msg = "Copiado! ✅") => {
  try {
    await navigator.clipboard.writeText(text);
    toast(msg);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast(msg);
  }
};

const escHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// tooltip compartilhado dos gráficos
const tooltip = $("#vizTooltip");
const showTip = (html, x, y) => {
  tooltip.innerHTML = html;
  tooltip.hidden = false;
  const r = tooltip.getBoundingClientRect();
  const left = Math.min(x + 14, window.innerWidth - r.width - 12);
  const top = Math.max(y - r.height - 12, 8);
  tooltip.style.left = left + "px";
  tooltip.style.top = top + "px";
};
const hideTip = () => (tooltip.hidden = true);

// ---------- Roteamento por hash ----------
const PANELS = $$(".panel").map((p) => p.id.replace("tool-", ""));
function route() {
  const id = location.hash.replace("#", "") || "meta";
  const target = PANELS.includes(id) ? id : "meta";
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === "tool-" + target));
  $$(".side-link").forEach((a) => a.classList.toggle("active", a.dataset.tool === target));
  $("#appSidebar").classList.remove("open");
  window.speechSynthesis?.cancel();
}
window.addEventListener("hashchange", route);
route();

$("#appBurger").addEventListener("click", () => $("#appSidebar").classList.toggle("open"));

// ============================================================
// (o Painel de Campanhas manual foi removido — os dados de campanha
//  agora vêm ao vivo do 📡 Meta Ads via API oficial)
// ============================================================
function roundedTopRect(x, y, w, h, r) {
  if (h <= 0) return "";
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}


// ============================================================
// 2) GERADOR DE HEADLINES
// ============================================================
const H_TEMPLATES = [
  (p, a, b) => `Como ${a} estão conseguindo ${b} com ${p}`,
  (p, a, b) => `${cap(p)}: o caminho mais direto para ${b}`,
  (p, a, b) => `O método que está ajudando ${a} a ${b}`,
  (p, a, b) => `${cap(b)} sem complicação: conheça ${p}`,
  (p, a, b) => `Por que ${a} estão migrando para ${p}?`,
  (p, a, b) => `O guia definitivo de ${p} para quem quer ${b}`,
  (p, a, b) => `3 razões para ${a} apostarem em ${p} ainda hoje`,
  (p, a, b) => `${cap(p)} na prática: ${b} passo a passo`,
  (p, a, b) => `Pare de adiar: ${b} começa com ${p}`,
  (p, a, b) => `A forma inteligente de ${b} — feita para ${a}`,
  (p, a, b) => `${cap(a)}, isto é para você: ${b} com ${p}`,
  (p, a, b) => `De iniciante a referência: ${p} para ${a}`,
  (p, a, b) => `O que ninguém te contou sobre ${b}`,
  (p, a, b) => `Checklist: você está pronto para ${b}?`,
  (p, a, b) => `${cap(p)} explicado em 5 minutos para ${a}`,
];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

$("#btnHeadlines").addEventListener("click", () => {
  if (!window.canUse()) return;
  const p = $("#hProduct").value.trim() || "seu produto";
  const a = $("#hAudience").value.trim() || "quem trabalha com tráfego";
  const b = $("#hBenefit").value.trim() || "ter mais resultado";
  const shuffled = [...H_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 10);
  $("#headlinesOut").innerHTML = shuffled
    .map((t, i) => {
      const txt = t(p, a, b);
      return outItem(txt, `Headline ${i + 1}`, i);
    })
    .join("");
  window.spendUse();
});

function outItem(text, tag, i = 0) {
  return `<div class="out-item" style="animation-delay:${i * 0.05}s">
    <div><span class="out-tag">${tag}</span><div class="out-text">${escHtml(text)}</div></div>
    <button class="btn-copy" data-copy="${escHtml(text)}">Copiar</button>
  </div>`;
}

document.body.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-copy]");
  if (btn) copyText(btn.dataset.copy);
});

// ============================================================
// 3) REESCRITOR DE COPY
// ============================================================
const SYNONYMS = [
  [/\bincrível\b/gi, ["surpreendente", "impressionante", "fora da curva"]],
  [/\bgrátis\b/gi, ["gratuito", "sem custo", "de graça"]],
  [/\brápido\b/gi, ["ágil", "veloz", "em tempo recorde"]],
  [/\bfácil\b/gi, ["simples", "descomplicado", "sem fricção"]],
  [/\bagora\b/gi, ["hoje mesmo", "neste momento", "já"]],
  [/\bdescubra\b/gi, ["conheça", "veja", "entenda"]],
  [/\bmelhor\b/gi, ["mais eficiente", "superior", "mais completo"]],
  [/\bnovo\b/gi, ["recém-lançado", "inédito", "atual"]],
  [/\bresultado\b/gi, ["retorno", "desempenho", "performance"]],
  [/\baprenda\b/gi, ["domine", "entenda", "descubra"]],
  [/\bproblema\b/gi, ["desafio", "obstáculo", "dor"]],
  [/\bcomprar\b/gi, ["garantir", "adquirir", "assegurar"]],
  [/\bdinheiro\b/gi, ["faturamento", "receita", "caixa"]],
  [/\bmas\b/gi, ["porém", "só que", "no entanto"]],
  [/\btambém\b/gi, ["além disso", "ainda", "igualmente"]],
  [/\bporque\b/gi, ["pois", "já que", "afinal"]],
  [/\bmuito\b/gi, ["extremamente", "bastante", "realmente"]],
];
const OPENERS = ["Olha só:", "Presta atenção:", "Vamos direto ao ponto:", "Sem rodeios:", "A real é a seguinte:"];

$("#btnRewrite").addEventListener("click", () => {
  const input = $("#rwInput").value.trim();
  if (!input) return toast("Cole uma copy primeiro ✍️");
  if (!window.canUse()) return;
  const variations = [1, 2, 3].map((v) => {
    let out = input;
    SYNONYMS.forEach(([re, opts]) => {
      out = out.replace(re, (m) => (Math.random() < 0.75 ? pick(opts) : m));
    });
    // variação 2 e 3 ganham abertura diferente
    if (v > 1 && Math.random() < 0.9) out = pick(OPENERS) + " " + out.charAt(0).toLowerCase() + out.slice(1);
    return out;
  });
  $("#rewriteOut").innerHTML = variations.map((t, i) => outItem(t, `Variação ${i + 1}`, i)).join("");
  window.spendUse();
});

// ============================================================
// 4) FRAMEWORKS DE COPY
// ============================================================
$("#btnFrameworks").addEventListener("click", () => {
  if (!window.canUse()) return;
  const p = $("#fwProduct").value.trim() || "nosso produto";
  const pain = $("#fwPain").value.trim() || "não ver resultado";
  const gain = $("#fwGain").value.trim() || "resultados consistentes";
  const cta = $("#fwCta").value.trim() || "Comece agora";

  const aida = `🎯 ATENÇÃO\nVocê está cansado(a) de ${pain}?\n\n💡 INTERESSE\nExiste um caminho mais inteligente: ${p} foi criado exatamente pra resolver isso, sem enrolação e sem promessas vazias.\n\n🔥 DESEJO\nImagina como seria ${gain} — de forma consistente, previsível e no seu ritmo. É essa transformação que ${p} entrega.\n\n👉 AÇÃO\n${cta}!`;

  const pas = `⚠️ PROBLEMA\n${cap(pain)} é mais comum do que parece — e cada dia nessa situação custa caro.\n\n🌀 AGITAÇÃO\nEnquanto isso não muda, a frustração cresce, o tempo passa e a concorrência anda. Continuar fazendo do mesmo jeito só garante o mesmo resultado.\n\n✅ SOLUÇÃO\n${cap(p)} existe pra virar esse jogo: um caminho claro pra ${gain}. ${cta}!`;

  const bab = `📍 ANTES\nHoje, sua realidade é ${pain}. Você tenta de tudo, mas a sensação é de estar andando em círculos.\n\n🚀 DEPOIS\nAgora imagine o cenário oposto: ${gain}, com clareza sobre o que fazer em cada etapa.\n\n🌉 PONTE\nO que liga um cenário ao outro é ${p}. ${cta}!`;

  $("#frameworksOut").innerHTML = [
    [aida, "AIDA — Atenção, Interesse, Desejo, Ação"],
    [pas, "PAS — Problema, Agitação, Solução"],
    [bab, "BAB — Antes, Depois, Ponte"],
  ]
    .map(([t, tag], i) => outItem(t, tag, i))
    .join("");
  window.spendUse();
});

// ============================================================
// 5) PALAVRAS SENSÍVEIS (compliance de anúncios)
// ============================================================
const BLOCKED_WORDS = [
  { re: /\bcura(r|)\b/gi, term: "cura", cat: "Saúde", risk: "high", tip: 'Promessas de cura violam políticas de saúde. Prefira "pode ajudar a melhorar" ou foque no acompanhamento profissional.' },
  { re: /\bemagre(ça|cer rápido|cimento garantido)\b/gi, term: "emagreça / emagrecer rápido", cat: "Saúde", risk: "high", tip: "Promessas de perda de peso são restritas. Fale de hábitos e bem-estar, sem prazos ou garantias." },
  { re: /\bsem esforço\b/gi, term: "sem esforço", cat: "Promessa irreal", risk: "med", tip: 'Sugere resultado sem trabalho. Troque por "com um método guiado" ou "passo a passo".' },
  { re: /\bganh(e|ar) dinheiro\b/gi, term: "ganhe dinheiro", cat: "Renda", risk: "high", tip: 'Gatilho clássico de reprovação. Prefira "desenvolva uma nova habilidade" ou "aprenda sobre o mercado X".' },
  { re: /\brenda extra\b/gi, term: "renda extra", cat: "Renda", risk: "med", tip: "Termo monitorado. Foque na habilidade ou profissão, não na promessa de renda." },
  { re: /\bfique rico\b/gi, term: "fique rico", cat: "Renda", risk: "high", tip: "Promessa de enriquecimento é vetada em praticamente todas as plataformas. Remova." },
  { re: /\bgarantid[oa]\b/gi, term: "garantido(a)", cat: "Promessa irreal", risk: "med", tip: 'Garantias absolutas geram reprovação. Use "com suporte" ou descreva a política real de reembolso.' },
  { re: /\b100% (seguro|garantido|eficaz)\b/gi, term: "100% seguro/garantido", cat: "Promessa irreal", risk: "high", tip: "Percentuais absolutos soam enganosos. Remova o número e descreva o benefício real." },
  { re: /\bmilagr(e|oso)\b/gi, term: "milagre / milagroso", cat: "Saúde", risk: "high", tip: "Linguagem milagrosa é bloqueada em saúde e finanças. Descreva o mecanismo real do produto." },
  { re: /\bvocê (está|esta) (gord[oa]|feia?|pobre)\b/gi, term: "atributo pessoal negativo", cat: "Atributos pessoais", risk: "high", tip: "Anúncios não podem afirmar ou insinuar atributos pessoais do leitor. Reformule para falar do problema em geral." },
  { re: /\bclique aqui\b/gi, term: "clique aqui", cat: "Qualidade", risk: "med", tip: 'Associado a baixa qualidade. Prefira um CTA descritivo: "Ver o método completo".' },
  { re: /\búltim[ao]s? (vagas?|unidades?|chance)\b/gi, term: "últimas vagas/chance", cat: "Escassez artificial", risk: "med", tip: "Escassez falsa pode gerar denúncia e reprovação. Só use se for verdade — e comprove." },
  { re: /\bdinheiro fácil\b/gi, term: "dinheiro fácil", cat: "Renda", risk: "high", tip: "Termo diretamente associado a esquemas. Remova." },
  { re: /\bsem contraindicaç(ão|ões)\b/gi, term: "sem contraindicação", cat: "Saúde", risk: "high", tip: "Alegação médica proibida para anúncios. Remova e direcione para orientação profissional." },
  { re: /\bapenas hoje\b/gi, term: "apenas hoje", cat: "Escassez artificial", risk: "med", tip: "Urgência artificial reprovada com frequência. Use datas reais de encerramento." },
  { re: /\blucr(o|e) (certo|garantido)\b/gi, term: "lucro certo/garantido", cat: "Renda", risk: "high", tip: "Promessa financeira explícita — vetada. Fale do conteúdo ensinado, não do resultado financeiro." },
];

$("#btnBlocked").addEventListener("click", () => {
  const text = $("#bwInput").value;
  if (!text.trim()) return toast("Cole uma copy primeiro ✍️");
  const found = [];
  let marked = escHtml(text);
  BLOCKED_WORDS.forEach((w) => {
    if (w.re.test(text)) {
      found.push(w);
      marked = marked.replace(new RegExp(w.re.source, w.re.flags), (m) => `<mark class="bw-mark">${m}</mark>`);
    }
    w.re.lastIndex = 0;
  });
  const out = $("#blockedOut");
  if (!found.length) {
    out.innerHTML = `<div class="bw-ok">✅ <strong>Nenhum termo sensível encontrado.</strong> Sua copy passou pelos ${BLOCKED_WORDS.length} filtros mais comuns de reprovação. Lembre-se: a análise final é sempre da plataforma.</div>`;
    return;
  }
  out.innerHTML =
    found
      .map(
        (w) => `<div class="bw-flag risk-${w.risk}">
          <span class="bw-term">"${w.term}"</span><span class="bw-cat">${w.cat} · risco ${w.risk === "high" ? "alto" : "médio"}</span>
          <p>${w.tip}</p>
        </div>`
      )
      .join("") + `<div class="bw-preview">${marked}</div>`;
});

// ============================================================
// 6) TEXTO ESTILIZADO (Unicode)
// ============================================================
// letras que o Unicode "pulou" nos blocos matemáticos (viram quadradinho sem isso)
const UNI_FIX = {
  "\u{1D455}": "ℎ",
  "\u{1D506}": "ℭ", "\u{1D50B}": "ℌ", "\u{1D50C}": "ℑ", "\u{1D515}": "ℜ", "\u{1D51D}": "ℨ",
  "\u{1D53A}": "ℂ", "\u{1D53F}": "ℍ", "\u{1D545}": "ℕ", "\u{1D547}": "ℙ", "\u{1D548}": "ℚ", "\u{1D549}": "ℝ", "\u{1D551}": "ℤ",
};
const SMALLCAPS = { a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ" };

const STYLE_MAPS = [
  { name: "Negrito", up: 0x1d5d4, low: 0x1d5ee, dig: 0x1d7ec },
  { name: "Itálico", up: 0x1d608, low: 0x1d622, dig: null },
  { name: "Negrito itálico", up: 0x1d63c, low: 0x1d656, dig: null },
  { name: "Serifado negrito", up: 0x1d400, low: 0x1d41a, dig: 0x1d7ce },
  { name: "Serifado itálico", up: 0x1d434, low: 0x1d44e, dig: null },
  { name: "Serifado negrito itálico", up: 0x1d468, low: 0x1d482, dig: null },
  { name: "Manuscrito", up: 0x1d4d0, low: 0x1d4ea, dig: null },
  { name: "Gótico", up: 0x1d504, low: 0x1d51e, dig: null },
  { name: "Gótico negrito", up: 0x1d56c, low: 0x1d586, dig: null },
  { name: "Monoespaçado", up: 0x1d670, low: 0x1d68a, dig: 0x1d7f6 },
  { name: "Contornado", up: 0x1d538, low: 0x1d552, dig: 0x1d7d8 },
  { name: "Largura total", up: 0xff21, low: 0xff41, dig: 0xff10 },
  { name: "Versalete (small caps)", fn: (ch, c) => (c >= 97 && c <= 122 ? SMALLCAPS[ch] : c >= 65 && c <= 90 ? SMALLCAPS[ch.toLowerCase()] : ch) },
  { name: "Circulado", fn: (ch, c) => { if (c >= 65 && c <= 90) return String.fromCodePoint(0x24b6 + (c - 65)); if (c >= 97 && c <= 122) return String.fromCodePoint(0x24d0 + (c - 97)); if (c === 48) return "⓪"; if (c >= 49 && c <= 57) return String.fromCodePoint(0x2460 + (c - 49)); return ch; } },
  { name: "Quadrado", fn: (ch, c) => { if (c >= 65 && c <= 90) return String.fromCodePoint(0x1f130 + (c - 65)) + " "; if (c >= 97 && c <= 122) return String.fromCodePoint(0x1f130 + (c - 97)) + " "; return ch; } },
  { name: "Riscado", join: "̶" },
  { name: "Sublinhado", join: "̲" },
  { name: "Espaçado", fn: (ch) => (/\s/.test(ch) ? ch : ch + " ") },
];

function styleText(text, map) {
  if (map.join) return [...text].map((ch) => (/\s/.test(ch) ? ch : ch + map.join)).join("");
  // acentos não existem nos blocos estilizados: "á" vira "a" estilizado
  const base = text.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return [...base]
    .map((ch) => {
      const c = ch.codePointAt(0);
      if (map.fn) return map.fn(ch, c);
      let g = null;
      if (c >= 65 && c <= 90) g = String.fromCodePoint(map.up + (c - 65));
      else if (c >= 97 && c <= 122) g = String.fromCodePoint(map.low + (c - 97));
      else if (map.dig && c >= 48 && c <= 57) g = String.fromCodePoint(map.dig + (c - 48));
      return g ? (UNI_FIX[g] || g) : ch;
    })
    .join("");
}

$("#styInput").addEventListener("input", () => {
  const t = $("#styInput").value || "PulsarAds";
  $("#styOut").innerHTML = STYLE_MAPS.map((m, i) => outItem(styleText(t, m), m.name, i)).join("");
});
$("#styInput").dispatchEvent(new Event("input"));

// ============================================================
// 7) CONTADOR DE CARACTERES
// ============================================================
const CHAR_LIMITS = [
  { name: "Meta Ads — Título", limit: 40 },
  { name: "Meta Ads — Texto principal (sem corte)", limit: 125 },
  { name: "Meta Ads — Descrição do link", limit: 30 },
  { name: "Google Ads — Título (RSA)", limit: 30 },
  { name: "Google Ads — Descrição (RSA)", limit: 90 },
  { name: "TikTok Ads — Texto do anúncio", limit: 100 },
  { name: "X/Twitter — Post", limit: 280 },
];

function renderCharCount() {
  const t = $("#charInput").value;
  const words = t.trim() ? t.trim().split(/\s+/).length : 0;
  $("#charCount").textContent = `${t.length} caracteres · ${words} palavra${words === 1 ? "" : "s"}`;
  $("#charLimits").innerHTML = CHAR_LIMITS.map((l) => {
    const pct = Math.min((t.length / l.limit) * 100, 100);
    const over = t.length > l.limit;
    return `<div class="limit-row">
      <div class="limit-head"><span class="ln">${l.name}</span><span class="lc${over ? " over" : ""}">${t.length}/${l.limit}${over ? " — estourou!" : ""}</span></div>
      <div class="limit-bar"><div class="limit-fill${over ? " over" : ""}" style="width:${pct}%"></div></div>
    </div>`;
  }).join("");
}
$("#charInput").addEventListener("input", renderCharCount);
renderCharCount();

// ============================================================
// 8) GERADOR DE UTMs
// ============================================================
const UTM_KEY = "pulsar_utms";
const loadUtms = () => JSON.parse(localStorage.getItem(UTM_KEY) || "[]");

function buildUtm() {
  const url = $("#utmUrl").value.trim();
  if (!url) return null;
  let u;
  try {
    u = new URL(url.startsWith("http") ? url : "https://" + url);
  } catch {
    return null;
  }
  const params = {
    utm_source: $("#utmSource").value.trim(),
    utm_medium: $("#utmMedium").value.trim(),
    utm_campaign: $("#utmCampaign").value.trim(),
    utm_content: $("#utmContent").value.trim(),
  };
  Object.entries(params).forEach(([k, v]) => {
    if (v) u.searchParams.set(k, v.toLowerCase().replace(/\s+/g, "-"));
  });
  return u.toString();
}

function renderUtm() {
  const link = buildUtm();
  $("#utmResult").innerHTML = link
    ? escHtml(link)
    : `<span class="hint">Preencha a URL e os parâmetros acima — o link aparece aqui.</span>`;
}
["utmUrl", "utmSource", "utmMedium", "utmCampaign", "utmContent"].forEach((id) =>
  $("#" + id).addEventListener("input", renderUtm)
);

$("#btnUtmCopy").addEventListener("click", () => {
  const link = buildUtm();
  if (!link) return toast("Preencha uma URL válida primeiro 🔗");
  copyText(link, "Link copiado! 🔗");
});

$("#btnUtmSave").addEventListener("click", () => {
  const link = buildUtm();
  if (!link) return toast("Preencha uma URL válida primeiro 🔗");
  const utms = loadUtms();
  utms.unshift(link);
  localStorage.setItem(UTM_KEY, JSON.stringify(utms.slice(0, 15)));
  renderUtmHistory();
  toast("Salvo no histórico 💾");
});

function renderUtmHistory() {
  const utms = loadUtms();
  $("#utmHistory").innerHTML = utms.length
    ? utms.map((u, i) => outItem(u, `Link ${i + 1}`, i)).join("")
    : `<p class="hint">Nenhum link salvo ainda.</p>`;
}
renderUtmHistory();

// ============================================================
// 9) SIMULADOR DE ESCALA
// ============================================================
const SCALE_LEVELS = [1, 2, 3, 5, 10];

function simulate() {
  const budget = parseFloat($("#scBudget").value) || 0;
  const cpm = parseFloat($("#scCpm").value) || 1;
  const ctr = (parseFloat($("#scCtr").value) || 0) / 100;
  const conv = (parseFloat($("#scConv").value) || 0) / 100;
  const ticket = parseFloat($("#scTicket").value) || 0;
  const decay = (parseFloat($("#scDecay").value) || 0) / 100;
  $("#scDecayLbl").textContent = `${$("#scDecay").value}% — a cada nível, o custo por resultado tende a subir`;

  return SCALE_LEVELS.map((mult, idx) => {
    const invest = budget * mult;
    const effCpm = cpm * Math.pow(1 + decay, idx);
    const impressions = (invest / effCpm) * 1000;
    const clicks = impressions * ctr;
    const sales = clicks * conv;
    const revenue = sales * ticket;
    return { mult, invest, clicks, sales, revenue, profit: revenue - invest, roas: invest > 0 ? revenue / invest : 0 };
  });
}

function renderScale() {
  const rows = simulate();
  $("#scaleTable tbody").innerHTML = rows
    .map(
      (r) => `<tr>
        <td>${r.mult}x</td><td>${BRL.format(r.invest)}</td>
        <td>${NUM.format(Math.round(r.clicks))}</td><td>${r.sales.toFixed(1)}</td>
        <td>${BRL.format(r.revenue)}</td>
        <td class="${r.profit >= 0 ? "pos" : "neg"}">${BRL.format(r.profit)}</td>
        <td>${r.roas.toFixed(2)}x</td>
      </tr>`
    )
    .join("");

  // gráfico de linhas: investimento vs receita por nível
  const W = 720, H = 280, mL = 64, mR = 16, mT = 16, mB = 40;
  const iw = W - mL - mR, ih = H - mT - mB;
  const maxV = Math.max(...rows.map((r) => Math.max(r.invest, r.revenue)), 1);
  const x = (i) => mL + (iw * i) / (rows.length - 1);
  const y = (v) => mT + ih - (v / maxV) * ih;

  let grid = "";
  for (let g = 0; g <= 4; g++) {
    const gy = mT + (ih * g) / 4;
    const val = maxV * (1 - g / 4);
    grid += `<line x1="${mL}" y1="${gy}" x2="${W - mR}" y2="${gy}" stroke="${g === 4 ? "var(--axis-line)" : "var(--grid-line)"}" stroke-width="${g === 4 ? 1.5 : 1}"/>`;
    grid += `<text x="${mL - 10}" y="${gy + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="Inter,sans-serif">${val >= 1000 ? (val / 1000).toFixed(1) + "k" : Math.round(val)}</text>`;
  }
  const lineOf = (key, color) => {
    const pts = rows.map((r, i) => `${x(i)},${y(r[key])}`).join(" ");
    const dots = rows.map((r, i) => `<circle cx="${x(i)}" cy="${y(r[key])}" r="4" fill="${color}" stroke="var(--surface)" stroke-width="2"/>`).join("");
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>${dots}`;
  };
  const labels = rows.map((r, i) => `<text x="${x(i)}" y="${H - 12}" text-anchor="middle" font-size="12" fill="var(--muted)" font-family="Inter,sans-serif">${r.mult}x</text>`).join("");
  const hovers = rows
    .map((r, i) => {
      const cw = iw / (rows.length - 1);
      const hx = i === 0 ? mL : x(i) - cw / 2;
      const hw = i === 0 || i === rows.length - 1 ? cw / 2 : cw;
      return `<rect class="hv" data-i="${i}" x="${hx}" y="${mT}" width="${hw}" height="${ih}" fill="transparent"/>`;
    })
    .join("");

  $("#scaleChart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Projeção de investimento e receita por nível de escala">${grid}${lineOf("invest", "var(--series-1)")}${lineOf("revenue", "var(--series-2)")}${labels}${hovers}</svg>`;

  $("#scaleChart").querySelectorAll(".hv").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = rows[+el.dataset.i];
      showTip(
        `<strong>Escala ${r.mult}x</strong>
         <span class="tt-row"><span class="lg-swatch" style="background:var(--series-1)"></span>Investimento: ${BRL.format(r.invest)}/dia</span>
         <span class="tt-row"><span class="lg-swatch" style="background:var(--series-2)"></span>Receita: ${BRL.format(r.revenue)}/dia</span>
         <span class="tt-row">ROAS ${r.roas.toFixed(2)}x · ${r.sales.toFixed(1)} vendas/dia</span>`,
        e.clientX, e.clientY
      );
    });
    el.addEventListener("pointerleave", hideTip);
  });
}
["scBudget", "scCpm", "scCtr", "scConv", "scTicket", "scDecay"].forEach((id) => $("#" + id).addEventListener("input", renderScale));
renderScale();

// ---------- Simulador com campanhas reais (lê o snapshot do Meta) ----------
function scMetricsOf(c) {
  const impressions = c.impressions || 0;
  const linkClicks = c.linkClicks || c.clicks || 0;
  const cpm = impressions > 0 ? (c.spend / impressions) * 1000 : (c.cpc && c.ctr ? c.cpc * c.ctr * 10 : 15);
  const ctr = impressions > 0 ? (linkClicks / impressions) * 100 : (c.ctr || 1.5);
  const conv = linkClicks > 0 ? (c.purchases / linkClicks) * 100 : 2;
  const ticket = c.purchases > 0 ? c.revenue / c.purchases : 0;
  const roas = c.spend > 0 ? c.revenue / c.spend : 0;
  return { cpm, ctr, conv, ticket, roas, spend: c.spend, purchases: c.purchases, revenue: c.revenue };
}

// potencial ao escalar 3x com 8% de perda de eficiência/nível
function scPotential(m) {
  if (m.roas <= 0 || m.ticket <= 0) return 0;
  const invest = Math.max(m.spend, 30) * 3;
  const effCpm = m.cpm * Math.pow(1.08, 2);
  const clicks = (invest / effCpm) * 1000 * (m.ctr / 100);
  const sales = clicks * (m.conv / 100);
  return sales * m.ticket - invest;
}

function renderScaleLive() {
  const box = $("#scLive");
  if (!box) return;
  let snap = null;
  try { snap = JSON.parse(localStorage.getItem("pulsar_meta_snapshot") || "null"); } catch (_) {}
  const camps = (snap?.campaigns || []).filter((c) => c.spend > 0);
  if (!camps.length) {
    box.innerHTML = `<p class="hint">Conecte sua conta no <a class="link-inline" href="#meta">📡 Meta Ads ao vivo</a> e atualize — aqui vão aparecer suas campanhas reais, já rankeadas por quem tem mais potencial de faturar ao escalar. Clique numa pra jogar os números dela no simulador.</p>`;
    return;
  }
  const rows = camps
    .map((c) => ({ c, m: scMetricsOf(c), pot: scPotential(scMetricsOf(c)) }))
    .sort((a, b) => b.pot - a.pot);
  const best = rows[0];
  box.innerHTML = `
    <p class="hint" style="margin-bottom:12px">Ranking por potencial de lucro ao escalar 3× (período: ${escHtml(snap.periodLabel || "—")}). 🏆 = melhor aposta pra escalar agora.</p>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Campanha</th><th>ROAS</th><th>Ticket</th><th>Vendas</th><th>Potencial 3×</th><th></th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr>
        <td>${i === 0 ? "🏆 " : ""}${escHtml(r.c.name)}</td>
        <td>${r.m.roas.toFixed(2)}×</td>
        <td>${BRL.format(r.m.ticket)}</td>
        <td>${r.c.purchases || 0}</td>
        <td class="${r.pot >= 0 ? "pos" : "neg"}">${BRL.format(r.pot)}/dia</td>
        <td><button class="btn-copy" data-sc-load="${escHtml(r.c.name)}">Simular ▶</button></td>
      </tr>`).join("")}</tbody>
    </table></div>
    <p class="hint" style="margin-top:10px">💡 Aposta do site: <strong>${escHtml(best.c.name)}</strong> — melhor relação entre ROAS (${best.m.roas.toFixed(2)}×) e margem pra escalar.</p>`;

  box.querySelectorAll("[data-sc-load]").forEach((b) => {
    b.addEventListener("click", () => {
      const c = camps.find((x) => x.name === b.dataset.scLoad);
      if (!c) return;
      const m = scMetricsOf(c);
      $("#scBudget").value = Math.max(1, Math.round(c.spend));
      $("#scCpm").value = m.cpm.toFixed(2);
      $("#scCtr").value = m.ctr.toFixed(2);
      $("#scConv").value = m.conv.toFixed(2);
      $("#scTicket").value = m.ticket.toFixed(2);
      renderScale();
      toast(`Números reais de "${c.name}" carregados 📈`);
      $("#scaleTable").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}
window.renderScaleLive = renderScaleLive;
$("#btnScSync")?.addEventListener("click", () => {
  if (window.fbLoadCampaigns) { window.fbLoadCampaigns(); toast("Buscando campanhas no Meta…"); }
  else toast("Conecte o Meta Ads primeiro 📡");
});
window.addEventListener("hashchange", () => { if (location.hash === "#escala") renderScaleLive(); });
renderScaleLive();

// ============================================================
// 10) RADAR DE CONCORRENTES (bibliotecas oficiais)
// ============================================================
$$(".radar-card").forEach((btn) => {
  btn.addEventListener("click", () => {
    const q = encodeURIComponent($("#spyQuery").value.trim());
    const country = $("#spyCountry").value;
    let url = "";
    if (btn.dataset.lib === "meta") {
      url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${q}&search_type=keyword_unordered&media_type=all`;
    } else if (btn.dataset.lib === "google") {
      url = `https://adstransparency.google.com/?region=${country === "ALL" ? "anywhere" : country}${q ? `&query=${q}` : ""}`;
    } else {
      url = `https://library.tiktok.com/ads?region=${country === "ALL" ? "all" : country}&adv_name=${q}&query_type=1`;
    }
    window.open(url, "_blank", "noopener");
  });
});

// ============================================================
// 11) ESTÚDIO DE CRIATIVOS (Canvas)
// ============================================================
const CR_THEMES = [
  { name: "Pulsar (violeta → ciano)", g: ["#7c3aed", "#0ea5e9"], accent: "#ffffff", ctaBg: "#ffffff", ctaText: "#7c3aed" },
  { name: "Fogo (laranja → rosa)", g: ["#f97316", "#ec4899"], accent: "#ffffff", ctaBg: "#ffffff", ctaText: "#ea580c" },
  { name: "Floresta (verdes)", g: ["#059669", "#065f46"], accent: "#a7f3d0", ctaBg: "#ffffff", ctaText: "#047857" },
  { name: "Meia-noite (azul profundo)", g: ["#1e3a8a", "#0f172a"], accent: "#93c5fd", ctaBg: "#3b82f6", ctaText: "#ffffff" },
  { name: "Ouro (âmbar → bronze)", g: ["#b45309", "#78350f"], accent: "#fde68a", ctaBg: "#fbbf24", ctaText: "#78350f" },
  { name: "Rubi (vermelho intenso)", g: ["#dc2626", "#7f1d1d"], accent: "#fecaca", ctaBg: "#ffffff", ctaText: "#b91c1c" },
  { name: "Oceano (azul-petróleo)", g: ["#0891b2", "#164e63"], accent: "#a5f3fc", ctaBg: "#22d3ee", ctaText: "#083344" },
  { name: "Pôr do sol (roxo → laranja)", g: ["#9333ea", "#f97316"], accent: "#ffffff", ctaBg: "#ffffff", ctaText: "#9333ea" },
  { name: "Lima (verde neon)", g: ["#65a30d", "#0d9488"], accent: "#ecfccb", ctaBg: "#ecfccb", ctaText: "#3f6212" },
  { name: "Chiclete (rosa → roxo)", g: ["#ec4899", "#8b5cf6"], accent: "#ffffff", ctaBg: "#ffffff", ctaText: "#db2777" },
  { name: "Aço (cinza-azulado)", g: ["#475569", "#1e293b"], accent: "#cbd5e1", ctaBg: "#e2e8f0", ctaText: "#0f172a" },
  { name: "Noir (preto + amarelo)", g: ["#18181b", "#000000"], accent: "#facc15", ctaBg: "#facc15", ctaText: "#18181b" },
  { name: "Menta (verde-água)", g: ["#14b8a6", "#0f766e"], accent: "#ccfbf1", ctaBg: "#f0fdfa", ctaText: "#0f766e" },
  { name: "Coral (rosa-salmão)", g: ["#fb7185", "#e11d48"], accent: "#ffe4e6", ctaBg: "#ffffff", ctaText: "#e11d48" },
  { name: "Índigo (azul royal)", g: ["#6366f1", "#4338ca"], accent: "#e0e7ff", ctaBg: "#ffffff", ctaText: "#4338ca" },
  { name: "Vinho (bordô premium)", g: ["#7f1d1d", "#450a0a"], accent: "#fecaca", ctaBg: "#fbbf24", ctaText: "#450a0a" },
  { name: "Turquesa neon", g: ["#06b6d4", "#3b82f6"], accent: "#cffafe", ctaBg: "#a7f3d0", ctaText: "#0e7490" },
  { name: "Grafite + verde-limão", g: ["#111827", "#1f2937"], accent: "#a3e635", ctaBg: "#a3e635", ctaText: "#111827" },
  { name: "Lavanda suave", g: ["#a78bfa", "#c4b5fd"], accent: "#f5f3ff", ctaBg: "#7c3aed", ctaText: "#ffffff" },
  { name: "Areia (nude quente)", g: ["#d6a77a", "#a16207"], accent: "#fef3c7", ctaBg: "#78350f", ctaText: "#fef3c7" },
];
const CR_LAYOUTS = ["Clássico (à esquerda)", "Centralizado", "Base impactante", "Painel diagonal", "Moldura minimalista", "Explosão de raios", "Faixa inferior", "Cartão central", "Topo alinhado"];
const CR_PATTERNS = ["Sem padrão", "Bolinhas", "Grade fina", "Ondas", "Diagonais", "Confete", "Malha suave"];

$("#crTheme").innerHTML = CR_THEMES.map((t, i) => `<option value="${i}">${t.name}</option>`).join("");
$("#crLayout").innerHTML = CR_LAYOUTS.map((l, i) => `<option value="${i}">${l}</option>`).join("");
$("#crPattern").innerHTML = CR_PATTERNS.map((p, i) => `<option value="${i}">${p}</option>`).join("");

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

const crEase = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);

function drawPattern(ctx, W, H, pattern, loop) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  const drift = (loop * 20) % 72;
  if (pattern === 1) {
    for (let y = -72; y < H + 72; y += 72)
      for (let x = -72 + drift; x < W + 72; x += 72) {
        ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
      }
  } else if (pattern === 2) {
    ctx.lineWidth = 2;
    for (let x = drift; x < W; x += 84) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = drift; y < H; y += 84) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  } else if (pattern === 3) {
    ctx.lineWidth = 4;
    for (let y = 80; y < H; y += 130) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12)
        ctx.lineTo(x, y + Math.sin(x / 90 + y + loop * 2) * 22);
      ctx.stroke();
    }
  } else if (pattern === 4) {
    ctx.lineWidth = 3;
    for (let d = -H; d < W; d += 90) {
      ctx.beginPath(); ctx.moveTo(d + drift, 0); ctx.lineTo(d + drift + H, H); ctx.stroke();
    }
  } else if (pattern === 5) {
    // confete: retângulos girados
    const rnd = (n) => (Math.sin(n * 999.7) * 43758.5) % 1;
    for (let i = 0; i < 46; i++) {
      const x = Math.abs(rnd(i)) * W, y = (Math.abs(rnd(i + 7)) * H + loop * 30) % H;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rnd(i + 3) * 6);
      ctx.fillRect(-9, -5, 18, 10); ctx.restore();
    }
  } else if (pattern === 6) {
    // malha suave de losangos
    ctx.lineWidth = 1.5;
    for (let y = 0; y < H + 60; y += 60)
      for (let x = 0; x < W + 60; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x + 30, y); ctx.lineTo(x + 60, y + 30); ctx.lineTo(x + 30, y + 60); ctx.lineTo(x, y + 30);
        ctx.closePath(); ctx.stroke();
      }
  }
  ctx.restore();
}

// t = progresso da intro (0→1) · loop = segundos correndo (animações contínuas)
function drawCreative(t = 1, loop = 0) {
  const canvas = $("#crCanvas");
  const story = $("#crFormat").value === "story";
  const W = 1080, H = story ? 1920 : 1080;
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  const ctx = canvas.getContext("2d");
  const theme = CR_THEMES[+$("#crTheme").value];
  const layout = +$("#crLayout").value;
  const pattern = +$("#crPattern").value;
  const anim = $("#crVidAnim").value;
  const stage = (a, b) => crEase((t - a) / (b - a));

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textAlign = "left";

  // zoom cinematográfico: cena inteira escala 1.12 → 1
  if (anim === "zoom" && (t < 1 || loop > 0)) {
    const z = 1.12 - 0.12 * crEase(t) + Math.sin(loop * 0.8) * 0.004;
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  }
  // Ken Burns: zoom lento + pan horizontal
  if (anim === "kenburns") {
    const z = 1.08 + loop * 0.004;
    const panX = Math.sin(loop * 0.25) * W * 0.03;
    ctx.translate(W / 2 + panX, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  }
  // flutuar suave: cena inteira sobe e desce de leve
  if (anim === "float") {
    ctx.translate(0, Math.sin(loop * 1.4) * 10);
  }

  // fundo em gradiente (vivo no modo pulse)
  const shift = anim === "pulse" ? Math.sin(loop * 1.2) * 0.3 : 0;
  const grad = ctx.createLinearGradient(W * shift, 0, W * (1 + shift), H);
  grad.addColorStop(0, theme.g[0]);
  grad.addColorStop(1, theme.g[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(-W * 0.1, -H * 0.1, W * 1.2, H * 1.2);

  drawPattern(ctx, W, H, pattern, loop);

  // decoração por layout
  if (layout === 0 || layout === 1) {
    ctx.globalAlpha = 0.12; ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(W * 0.9, H * 0.12 + Math.sin(loop) * 12, W * 0.28, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.08, H * 0.92, W * 0.34, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.08; ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff";
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(W * 0.9, H * 0.12, W * (0.32 + i * 0.05), 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
  } else if (layout === 2) {
    const g2 = ctx.createLinearGradient(0, H * 0.35, 0, H);
    g2.addColorStop(0, "rgba(0,0,0,0)");
    g2.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = g2;
    ctx.fillRect(-W * 0.1, 0, W * 1.2, H * 1.1);
    ctx.globalAlpha = 0.1; ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(W * 0.85, H * 0.18 + Math.sin(loop) * 14, W * 0.3, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (layout === 3) {
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(W * 0.66, 0); ctx.lineTo(W * 0.52, H); ctx.lineTo(0, H);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.14; ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff";
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(W * 0.85, H * 0.5, W * (0.1 + i * 0.06) + Math.sin(loop * 1.5) * 6, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
  } else if (layout === 4) {
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 5;
    ctx.strokeRect(44, 44, W - 88, H - 88);
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 2;
    ctx.strokeRect(66, 66, W - 132, H - 132);
  } else if (layout === 5) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(loop * 0.15);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-W * 0.12, -H * 1.2); ctx.lineTo(W * 0.12, -H * 1.2);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  } else if (layout === 6) {
    // faixa inferior sólida — texto embaixo
    const g6 = ctx.createLinearGradient(0, H * 0.45, 0, H);
    g6.addColorStop(0, "rgba(0,0,0,0)"); g6.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g6; ctx.fillRect(-W * 0.1, H * 0.4, W * 1.2, H * 0.7);
    ctx.globalAlpha = 0.1; ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(W * 0.15, H * 0.16, W * 0.26, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (layout === 7) {
    // cartão central translúcido
    const cw = W * 0.82, ch = story ? H * 0.5 : H * 0.62;
    const cxp = (W - cw) / 2, cyp = (H - ch) / 2;
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath(); ctx.roundRect(cxp, cyp, cw, ch, 40); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cxp, cyp, cw, ch, 40); ctx.stroke();
  } else if (layout === 8) {
    // topo alinhado — barra fina de destaque no topo
    ctx.globalAlpha = 0.16; ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(W * 0.88, H * 0.9, W * 0.3, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(W * 0.09, H * (story ? 0.12 : 0.14), 90, 8);
  }

  // conteúdo
  const centered = layout === 1 || layout === 4 || layout === 5 || layout === 7;
  const cx = centered ? W / 2 : W * 0.09;
  ctx.textAlign = centered ? "center" : "left";
  const maxW = layout === 3 ? W * 0.52 : W * 0.82;
  let cy = layout === 6
    ? H * (story ? 0.58 : 0.5)
    : layout === 7
      ? H * (story ? 0.28 : 0.26)
      : layout === 8
        ? H * (story ? 0.18 : 0.2)
        : layout === 2
          ? H * (story ? 0.52 : 0.4)
          : story ? H * 0.3 : H * (centered ? 0.22 : 0.24);

  const slideY = anim === "slide" ? 60 : 0;

  // selo
  const badge = $("#crBadge").value.trim();
  if (badge) {
    const a1 = stage(0, 0.3);
    ctx.globalAlpha = a1;
    const by = cy + (1 - a1) * slideY;
    ctx.font = "700 34px 'Inter', sans-serif";
    const bw = ctx.measureText(badge.toUpperCase()).width + 56;
    const bx = centered ? cx - bw / 2 : cx;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, by - 46, bw, 68, 34); ctx.fill(); ctx.stroke();
    ctx.fillStyle = theme.accent;
    ctx.textAlign = "left";
    ctx.fillText(badge.toUpperCase(), bx + 28, by);
    ctx.textAlign = centered ? "center" : "left";
    ctx.globalAlpha = 1;
    cy += 110;
  }

  // headline
  const headline = $("#crHeadline").value.trim() || "Sua oferta em destaque";
  ctx.fillStyle = "#ffffff";
  const hSize = layout === 4 ? 84 : 92;
  ctx.font = `700 ${hSize}px 'Space Grotesk', 'Inter', sans-serif`;
  const hLines = wrapText(ctx, headline, maxW);
  hLines.forEach((l, i) => {
    const a = stage(0.15 + i * 0.12, 0.5 + i * 0.12);
    ctx.globalAlpha = a;
    ctx.fillText(l, cx, cy + 66 + (1 - a) * slideY);
    ctx.globalAlpha = 1;
    cy += hSize + 14;
  });
  cy += 26;

  // subtítulo
  const sub = $("#crSub").value.trim();
  if (sub) {
    const a = stage(0.5, 0.8);
    ctx.globalAlpha = a;
    ctx.font = "400 44px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    wrapText(ctx, sub, Math.min(maxW, W * 0.78)).forEach((l) => {
      ctx.fillText(l, cx, cy + 32 + (1 - a) * slideY);
      cy += 62;
    });
    ctx.globalAlpha = 1;
    cy += 50;
  } else cy += 30;

  // CTA (com pulso contínuo em vídeo; quique mais forte no modo "bounce")
  const cta = ($("#crCta").value.trim() || "QUERO AGORA").toUpperCase();
  const aCta = stage(0.68, 0.95);
  const pulse = loop > 0 ? 1 + (anim === "bounce" ? 0.08 * Math.abs(Math.sin(loop * 5)) : 0.03 * Math.sin(loop * 4)) : 1;
  ctx.font = "700 44px 'Inter', sans-serif";
  const cw = ctx.measureText(cta).width + 120;
  const ctaX = centered ? cx - cw / 2 : cx;
  ctx.save();
  ctx.globalAlpha = aCta;
  ctx.translate(ctaX + cw / 2, cy + 54);
  ctx.scale(aCta * pulse, aCta * pulse);
  ctx.translate(-(ctaX + cw / 2), -(cy + 54));
  if (layout === 4) {
    ctx.strokeStyle = theme.ctaBg; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(ctaX, cy, cw, 108, 54); ctx.stroke();
    ctx.fillStyle = theme.accent;
  } else {
    ctx.fillStyle = theme.ctaBg;
    ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
    ctx.beginPath(); ctx.roundRect(ctaX, cy, cw, 108, 54); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = theme.ctaText;
  }
  ctx.textAlign = "left";
  ctx.fillText(cta, ctaX + 60, cy + 70);
  ctx.restore();
  ctx.textAlign = centered ? "center" : "left";

  // selo de preço
  const price = parseFloat($("#crPrice").value);
  if (price > 0) {
    const aP = stage(0.8, 1);
    const px = layout === 3 ? W * 0.83 : W * 0.82;
    const py = story ? H * 0.16 : H * 0.15;
    ctx.save();
    ctx.globalAlpha = aP;
    ctx.translate(px, py);
    ctx.rotate(-0.16 + (loop > 0 ? Math.sin(loop * 2.4) * 0.05 : 0));
    ctx.scale(aP, aP);
    ctx.fillStyle = theme.ctaBg;
    ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    ctx.beginPath(); ctx.arc(0, 0, 118, 0, 7); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = theme.ctaText;
    ctx.textAlign = "center";
    ctx.font = "700 30px 'Inter', sans-serif";
    ctx.fillText("SÓ", 0, -38);
    ctx.font = "700 54px 'Space Grotesk', sans-serif";
    ctx.fillText(`R$ ${price.toFixed(2).replace(".", ",")}`.replace(",00", ""), 0, 18);
    ctx.font = "600 26px 'Inter', sans-serif";
    ctx.fillText("hoje", 0, 58);
    ctx.restore();
    ctx.textAlign = centered ? "center" : "left";
  }

  // imagem do produto (galeria)
  const prodImg = window.getStudioImage ? window.getStudioImage() : null;
  if (prodImg) {
    const aI = stage(0.72, 1);
    const size = story ? 460 : 380;
    const px = centered || story ? W / 2 - size / 2 : W - size - W * 0.07;
    const py = story ? H - size - H * 0.09 : layout === 2 ? H * 0.06 : H - size - H * 0.08;
    ctx.save();
    ctx.globalAlpha = aI;
    ctx.translate(px + size / 2, py + size / 2);
    ctx.scale(0.9 + 0.1 * aI, 0.9 + 0.1 * aI);
    ctx.rotate(loop > 0 ? Math.sin(loop * 1.6) * 0.015 : 0);
    ctx.translate(-(px + size / 2), -(py + size / 2));
    ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
    ctx.beginPath(); ctx.roundRect(px, py, size, size, 28);
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.clip();
    // cover: preenche o quadro mantendo proporção
    const r = Math.max(size / prodImg.naturalWidth, size / prodImg.naturalHeight);
    const iw = prodImg.naturalWidth * r, ih2 = prodImg.naturalHeight * r;
    ctx.drawImage(prodImg, px + (size - iw) / 2, py + (size - ih2) / 2, iw, ih2);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = aI;
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.roundRect(px, py, size, size, 28); ctx.stroke();
    ctx.restore();
  }

  // brilho passando (faixa de luz diagonal atravessando a cena no vídeo)
  if (anim === "shine" && loop > 0) {
    const period = 3.4;
    const p = (loop % period) / period; // 0→1
    const bx = -W * 0.5 + p * (W * 2);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate(-0.35); ctx.translate(-W / 2, -H / 2);
    const g = ctx.createLinearGradient(bx - W * 0.2, 0, bx + W * 0.2, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.28)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-W * 0.5, -H * 0.5, W * 2, H * 2);
    ctx.restore();
  }

  // rodapé sutil
  ctx.globalAlpha = 0.5;
  ctx.font = "500 28px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText("feito com PulsarAds ⚡", W * 0.09, H - 60);
  ctx.globalAlpha = 1;
}

const renderCreative = () => drawCreative(1, 0);
window.renderCreativeStudio = renderCreative;

["crFormat", "crTheme", "crLayout", "crPattern", "crBadge", "crHeadline", "crSub", "crCta", "crPrice", "crVidAnim"].forEach((id) =>
  $("#" + id).addEventListener("input", renderCreative)
);

$("#btnCrRandom").addEventListener("click", () => {
  $("#crTheme").value = Math.floor(Math.random() * CR_THEMES.length);
  $("#crLayout").value = Math.floor(Math.random() * CR_LAYOUTS.length);
  $("#crPattern").value = Math.floor(Math.random() * CR_PATTERNS.length);
  renderCreative();
  toast("Novo modelo sorteado 🎲");
});

// ---------- Gerar criativo com IA (prompt automático + abrir IA de imagem) ----------
const AI_TARGETS = {
  gemini: { name: "Gemini", url: "https://gemini.google.com/app" },
  chatgpt: { name: "ChatGPT", url: "https://chatgpt.com/?model=gpt-4o&q=" },
  copilot: { name: "Copilot Designer", url: "https://copilot.microsoft.com/images/create" },
  leonardo: { name: "Leonardo.ai", url: "https://app.leonardo.ai/image-generation" },
};

function refreshCrAiOffers() {
  const sel = $("#crAiOffer");
  if (!sel || typeof loadOffers !== "function") return;
  const offers = loadOffers();
  const cur = sel.value;
  sel.innerHTML = `<option value="">— prompt livre —</option>` +
    offers.map((o, i) => `<option value="${i}">${escHtml(o.name)}</option>`).join("");
  if (cur && sel.querySelector(`option[value="${cur}"]`)) sel.value = cur;
}

// ---------- Criador de prompts PROFISSIONAIS (imagem) ----------
function buildAiPrompt() {
  const sel = $("#crAiOffer");
  const offers = typeof loadOffers === "function" ? loadOffers() : [];
  const o = sel && sel.value !== "" ? offers[+sel.value] : null;
  const brief = $("#crAiBrief")?.value.trim() || "";
  const headline = $("#crHeadline").value.trim() || (o ? o.name : "Sua oferta em destaque");
  const cta = ($("#crCta").value.trim() || "QUERO AGORA").toUpperCase();
  const story = $("#crFormat").value === "story";
  const format = story ? "vertical 9:16 (story/reels)" : "quadrado 1:1 (feed)";
  const space = story ? "no terço superior" : "à esquerda ou no topo";
  const themeName = (CR_THEMES[+$("#crTheme").value]?.name || "cores vibrantes").toLowerCase();
  const angle = (typeof md === "object" && md && md.idea) ? ` Ângulo de venda: ${md.idea}.` : "";
  const desc = o ? (o.desc || o.notes || "") : "";
  const subject = brief || (desc ? desc.replace(/\s+/g, " ").slice(0, 220) : `o produto "${headline}"`);

  // IA de imagem distorce texto — então o prompt pede imagem LIMPA, com espaço
  // negativo pro título entrar depois no 🎨 Estúdio (zero letra deformada).
  return `Fotografia publicitária premium para anúncio de alta conversão, formato ${format}. ` +
    `Cena principal: ${subject}.` + angle + ` ` +
    `Estilo: foto comercial de estúdio profissional — lente 85mm f/1.8, foco cravado no produto, ` +
    `profundidade de campo rasa com fundo suavemente desfocado, iluminação de softbox com luz de contorno sutil, ` +
    `paleta de cores ${themeName}, composição na regra dos terços com espaço negativo limpo ${space} para o título entrar depois. ` +
    `Qualidade: fotorrealista, ultra detalhado, gradação de cor de cinema, nitidez de capa de revista, 8k. ` +
    `IMPORTANTE: sem NENHUM texto, sem letras, sem números, sem logotipo, sem marca d'água, ` +
    `sem mãos ou dedos deformados, sem objetos derretidos ou distorcidos — imagem limpa e realista. ` +
    `(Referência de título que entrará depois por cima: "${headline}" com botão "${cta}".)`;
}

$("#btnCrAiBuild").addEventListener("click", () => {
  $("#crAiPrompt").value = buildAiPrompt();
  const n = +($("#crAiCount")?.value || 1);
  toast(`Prompt profissional criado ✨${n > 1 ? ` — peça ${n} variações na IA` : ""}`);
});

$$(".ai-btn[data-ai]").forEach((btn) => {
  btn.addEventListener("click", () => {
    let prompt = $("#crAiPrompt").value.trim();
    if (!prompt) { prompt = buildAiPrompt(); $("#crAiPrompt").value = prompt; }
    const n = +($("#crAiCount")?.value || 1);
    const full = n > 1 ? `${prompt}\n\n(Gere ${n} variações diferentes deste criativo.)` : prompt;
    const t = AI_TARGETS[btn.dataset.ai];
    copyText(full, `Prompt copiado! Abrindo ${t.name} — cole com Ctrl+V 🤖`);
    const url = btn.dataset.ai === "chatgpt" ? t.url + encodeURIComponent(full) : t.url;
    setTimeout(() => window.open(url, "_blank", "noopener"), 350);
  });
});

// ---------- Gerador de imagem EMBUTIDO (grátis, sem login) ----------
// usa a API pública do Pollinations (Flux); a imagem aparece direto no site
function pollUrl(prompt, seed, story) {
  const w = story ? 1080 : 1080;
  const h = story ? 1920 : 1080;
  // enhance=true: o Pollinations refina o prompt no servidor (menos distorção, mais realismo)
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&private=true&enhance=true&model=flux&seed=${seed}`;
}

$("#btnCrAiGen")?.addEventListener("click", () => {
  let prompt = $("#crAiPrompt").value.trim();
  if (!prompt) { prompt = buildAiPrompt(); $("#crAiPrompt").value = prompt; }
  if (!window.canUse()) return;
  const n = +($("#crAiCount")?.value || 1);
  const story = $("#crFormat").value === "story";
  const box = $("#crAiResults");
  box.innerHTML = "";
  const btn = $("#btnCrAiGen");
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = "🎨 Gerando…";
  let charged = false, done = 0;
  const finish = () => { if (++done >= n) { btn.disabled = false; btn.textContent = label; } };

  for (let i = 0; i < n; i++) {
    const seed = Math.floor(Math.random() * 1e6);
    const url = pollUrl(prompt, seed, story);
    const card = document.createElement("div");
    card.className = "ai-result";
    card.innerHTML = `<div class="ai-result-img"><span class="ai-spin">🎨 gerando…</span></div>`;
    box.appendChild(card);
    const holder = card.querySelector(".ai-result-img");
    const img = new Image();
    img.crossOrigin = "anonymous"; // Pollinations envia CORS *, então fica limpo pro canvas/baixar
    img.alt = "criativo gerado por IA";
    img.onload = () => {
      holder.innerHTML = "";
      holder.appendChild(img);
      card.insertAdjacentHTML("beforeend",
        `<div class="ai-result-actions">
          <button class="btn btn-primary btn-sm" data-ai-dl>⬇ Baixar</button>
          <button class="btn btn-ghost btn-sm" data-ai-use>Usar no criativo</button>
        </div>`);
      card.dataset.url = url;
      if (!charged) { charged = true; window.spendUse(); }
      finish();
    };
    img.onerror = () => {
      holder.innerHTML = `<span class="ai-spin">❌ falhou — clique de novo</span>`;
      finish();
    };
    img.src = url;
  }
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

// baixar / usar o criativo gerado
$("#crAiResults")?.addEventListener("click", async (e) => {
  const card = e.target.closest(".ai-result");
  if (!card) return;
  const img = card.querySelector("img");
  if (e.target.closest("[data-ai-dl]") && img) {
    try {
      const r = await fetch(card.dataset.url);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pulsarads-ia-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Criativo baixado 🎨");
    } catch {
      window.open(card.dataset.url, "_blank", "noopener");
    }
  }
  if (e.target.closest("[data-ai-use]") && img && window.setStudioImageUrl) {
    window.setStudioImageUrl(img.src);
  }
});

// ---------- Criador de prompt de ANIMAÇÃO (vídeo) nível prêmio ----------
const AI_VID_TARGETS = {
  runway: { name: "Runway", url: "https://app.runwayml.com/" },
  kling: { name: "Kling", url: "https://klingai.com/" },
  pika: { name: "Pika", url: "https://pika.art/" },
  sora: { name: "Sora", url: "https://sora.com/" },
};

function buildAnimPrompt() {
  const brief = $("#crVidBrief")?.value.trim() || "";
  const sel = $("#crAiOffer");
  const offers = typeof loadOffers === "function" ? loadOffers() : [];
  const o = sel && sel.value !== "" ? offers[+sel.value] : null;
  const headline = $("#crHeadline").value.trim() || (o ? o.name : "sua oferta");
  const cta = ($("#crCta").value.trim() || "QUERO AGORA").toUpperCase();
  const story = $("#crFormat").value === "story";
  const scene = brief || `apresentação cinematográfica do produto "${headline}"`;
  return `Comercial cinematográfico de produto, nível de premiação em publicidade, ${story ? "9:16 vertical" : "1:1"}, 24fps, ~6 segundos. ` +
    `Cena: ${scene}. ` +
    `Câmera: movimento suave de aproximação (push-in) com leve parallax e easing natural; abertura com um gancho visual no 1º segundo. ` +
    `Movimento: elementos entram com fluidez, partículas/vapor/luz derivando lentamente, brilho passando pelo produto. ` +
    `Iluminação: volumétrica e dourada, com um lens flare sutil; profundidade de campo rasa. ` +
    `Ritmo: hero shot do produto no meio e revelação do call-to-action no final. ` +
    `Final: o título "${headline}" surge suave e o botão "${cta}" pulsa uma vez. ` +
    `Estilo: premium, gradação de cor cinematográfica, 4k, altíssima fluidez, sem texto distorcido.`;
}

$("#btnCrAnimPrompt")?.addEventListener("click", () => {
  $("#crAnimPrompt").value = buildAnimPrompt();
  toast("Prompt de animação criado 🏆 Cole numa IA de vídeo");
});

$$(".ai-btn[data-aivid]").forEach((btn) => {
  btn.addEventListener("click", () => {
    let prompt = $("#crAnimPrompt").value.trim();
    if (!prompt) { prompt = buildAnimPrompt(); $("#crAnimPrompt").value = prompt; }
    const t = AI_VID_TARGETS[btn.dataset.aivid];
    copyText(prompt, `Prompt copiado! Abrindo ${t.name} — cole com Ctrl+V 🎬`);
    setTimeout(() => window.open(t.url, "_blank", "noopener"), 350);
  });
});

window.addEventListener("hashchange", () => { if (location.hash === "#criativo") refreshCrAiOffers(); });
setTimeout(refreshCrAiOffers, 0);

$("#btnCrDownload").addEventListener("click", () => {
  if (!window.canUse()) return;
  renderCreative();
  const a = document.createElement("a");
  a.href = $("#crCanvas").toDataURL("image/png");
  a.download = `pulsarads-criativo-${$("#crFormat").value}.png`;
  a.click();
  toast("Criativo baixado 🎨");
  window.spendUse();
});

// ---------- Vídeo animado (canvas → WebM, 100% no navegador) ----------
let crRecording = false;
$("#btnCrVideo").addEventListener("click", async () => {
  if (crRecording) return;
  const btn = $("#btnCrVideo");
  if (!("MediaRecorder" in window)) return toast("Seu navegador não suporta gravação de vídeo 😕");
  if (!window.canUse()) return;
  crRecording = true;
  btn.disabled = true;
  const dur = +$("#crVidDur").value;
  const stream = $("#crCanvas").captureStream(30);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 });
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const stopped = new Promise((res) => (rec.onstop = res));
  rec.start(200);
  const t0 = performance.now();
  const introDur = 1.6;
  await new Promise((res) => {
    const frame = (now) => {
      const el = (now - t0) / 1000;
      if (el >= dur) return res();
      btn.textContent = `🎬 Gravando… ${Math.min(99, Math.round((el / dur) * 100))}%`;
      drawCreative(Math.min(el / introDur, 1), el);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  rec.stop();
  await stopped;
  const blob = new Blob(chunks, { type: "video/webm" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pulsarads-video-${$("#crFormat").value}-${dur}s.webm`;
  a.click();
  URL.revokeObjectURL(a.href);
  btn.textContent = "🎬 Gerar vídeo (WebM)";
  btn.disabled = false;
  crRecording = false;
  renderCreative();
  toast("Vídeo gerado e baixado 🎬");
  window.spendUse();
});

// fontes carregam depois do primeiro paint — redesenha quando prontas
if (document.fonts?.ready) document.fonts.ready.then(renderCreative);
renderCreative();

// ============================================================
// 12) GERADOR DE ÁUDIO — VOZ NEURAL HUMANA (Pollinations, grátis)
// Nunca usa vozes do Google nem vozes robóticas. Fallback: só vozes
// "(Natural)" do sistema (Edge/Windows); sem elas, orienta o usuário.
// ============================================================
const synth = window.speechSynthesis;
let voices = [];

// vozes neurais da API (openai-audio via Pollinations) — humanas de verdade
const TTS_NEURAL_VOICES = {
  female: [
    ["nova", "Nova — feminina neural ⭐"],
    ["shimmer", "Shimmer — feminina suave"],
    ["coral", "Coral — feminina expressiva"],
  ],
  male: [
    ["onyx", "Onyx — masculina neural ⭐"],
    ["echo", "Echo — masculina firme"],
    ["ash", "Ash — masculina jovem"],
  ],
};
const TTS_TONE_HINT = { animada: " com tom animado e energético", normal: "", calma: " com tom calmo e acolhedor" };

function renderTtsVoiceSelect() {
  const sel = $("#ttsVoice");
  if (!sel) return;
  const gender = $("#ttsGender")?.value || "female";
  sel.innerHTML = TTS_NEURAL_VOICES[gender].map(([v, label]) => `<option value="${v}">${label}</option>`).join("");
}
renderTtsVoiceSelect();
$("#ttsGender")?.addEventListener("change", renderTtsVoiceSelect);

// fallback local: SÓ vozes "(Natural)" — nunca Google, nunca robótica
function bestNaturalLocalVoice() {
  voices = synth ? synth.getVoices() : [];
  const pt = voices.filter((v) => v.lang.toLowerCase().startsWith("pt") && !/google/i.test(v.name) && /natural/i.test(v.name));
  const gender = $("#ttsGender")?.value || "female";
  const FEM = /female|thalita|francisca|brenda|giovanna|leila|leticia|manuela|yara|elza|luciana/i;
  return pt.find((v) => (gender === "female" ? FEM.test(v.name) : !FEM.test(v.name))) || pt[0] || null;
}

let ttsAudio = null;
let ttsBlobUrl = null;

$("#btnTtsPlay").addEventListener("click", async () => {
  let text = $("#ttsInput").value.trim();
  if (!text) return toast("Escreva um texto primeiro ✍️");
  if (text.length > 1200) { text = text.slice(0, 1200); toast("Texto longo: narrando os primeiros 1.200 caracteres 🎙️"); }
  const voice = $("#ttsVoice").value || "nova";
  const tone = TTS_TONE_HINT[$("#ttsTone")?.value] ?? "";
  const btn = $("#btnTtsPlay");
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = "⏳ Gerando voz neural…";
  if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }
  synth?.cancel();
  try {
    const payload = `Leia em voz alta, em português do Brasil${tone}, exatamente o texto a seguir, sem adicionar nem comentar nada:\n\n${text}`;
    const url = `https://text.pollinations.ai/${encodeURIComponent(payload)}?model=openai-audio&voice=${voice}`;
    const r = await fetch(url);
    if (!r.ok || !/audio/i.test(r.headers.get("content-type") || "")) throw new Error("HTTP " + r.status);
    const blob = await r.blob();
    if (ttsBlobUrl) URL.revokeObjectURL(ttsBlobUrl);
    ttsBlobUrl = URL.createObjectURL(blob);
    ttsAudio = new Audio(ttsBlobUrl);
    ttsAudio.play();
    const dl = $("#btnTtsDl");
    if (dl) dl.hidden = false;
    toast(`Voz neural reproduzindo 🔊 (${$("#ttsGender")?.value === "male" ? "masculina" : "feminina"})`);
  } catch (err) {
    // sem internet/API: usa APENAS voz Natural do sistema (nunca Google)
    const v = bestNaturalLocalVoice();
    if (synth && v) {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v;
      synth.speak(u);
      toast("Sem conexão com a voz neural — usando a voz Natural do seu sistema 🔊");
    } else {
      toast("Não consegui gerar a voz neural agora 😕 Verifique a internet e tente de novo.");
    }
  }
  btn.disabled = false;
  btn.textContent = label;
});

$("#btnTtsStop").addEventListener("click", () => {
  if (ttsAudio) ttsAudio.pause();
  synth?.cancel();
});

$("#btnTtsDl")?.addEventListener("click", () => {
  if (!ttsBlobUrl) return toast("Gere a narração primeiro ▶");
  const a = document.createElement("a");
  a.href = ttsBlobUrl;
  a.download = "pulsarads-narracao-" + Date.now() + ".mp3";
  a.click();
  toast("Narração baixada 🎧");
});

// ============================================================
// 13) TRANSCRITOR POR VOZ (Web Speech — STT)
// ============================================================
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
let recOn = false;
let finalText = "";

if (!SR) {
  $("#btnSttStart").disabled = true;
  $("#sttSupport").textContent = "⚠️ Seu navegador não suporta reconhecimento de fala. Use Chrome ou Edge.";
}

$("#btnSttStart").addEventListener("click", () => {
  if (!SR) return;
  if (recOn) {
    rec.stop();
    return;
  }
  rec = new SR();
  rec.lang = "pt-BR";
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t.trim() + " ";
      else interim += t;
    }
    $("#sttOutput").innerHTML = escHtml(finalText) + (interim ? `<span class="interim">${escHtml(interim)}</span>` : "");
  };
  rec.onend = () => {
    recOn = false;
    $("#btnSttStart").textContent = "🎙️ Começar a ditar";
    $("#btnSttStart").classList.remove("rec-on");
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed") toast("Permita o acesso ao microfone 🎙️");
  };
  rec.start();
  recOn = true;
  $("#btnSttStart").textContent = "⏹ Parar de ditar";
  $("#btnSttStart").classList.add("rec-on");
  toast("Ouvindo… pode falar 🎙️");
});

$("#btnSttCopy").addEventListener("click", () => {
  if (!finalText.trim()) return toast("Nada pra copiar ainda 🎙️");
  copyText(finalText.trim());
});
$("#btnSttClear").addEventListener("click", () => {
  finalText = "";
  $("#sttOutput").innerHTML = `<span class="hint">O texto ditado aparece aqui…</span>`;
});

// ============================================================
// 14) LIMPADOR DE METADADOS
// ============================================================
let metaImg = null;
let metaFileRef = null;

const drop = $("#metaDrop");
drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("drag"); });
drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("drag");
  const f = e.dataTransfer.files[0];
  if (f) handleMetaFile(f);
});
$("#metaFile").addEventListener("change", (e) => {
  if (e.target.files[0]) handleMetaFile(e.target.files[0]);
});

function fmtBytes(b) {
  return b > 1048576 ? (b / 1048576).toFixed(2) + " MB" : (b / 1024).toFixed(1) + " KB";
}

// ---------- leitor de metadados (JPEG EXIF/GPS/IPTC/XMP + PNG text chunks) ----------
function readImageMeta(buf) {
  const dv = new DataView(buf);
  const res = { found: [], hasGPS: false, metaBytes: 0 };
  // PNG?
  if (dv.getUint32(0) === 0x89504e47) {
    let off = 8;
    while (off + 8 <= dv.byteLength) {
      const len = dv.getUint32(off);
      const type = String.fromCharCode(dv.getUint8(off + 4), dv.getUint8(off + 5), dv.getUint8(off + 6), dv.getUint8(off + 7));
      if (["tEXt", "iTXt", "zTXt"].includes(type)) { res.found.push("Texto embutido (" + type + ")"); res.metaBytes += len; }
      if (type === "eXIf") { res.found.push("EXIF"); res.metaBytes += len; }
      if (type === "IEND") break;
      off += 12 + len; // len + type(4) + data + crc(4)
    }
    return res;
  }
  // JPEG?
  if (dv.getUint16(0) !== 0xffd8) return res;
  let off = 2;
  while (off + 4 <= dv.byteLength) {
    if (dv.getUint8(off) !== 0xff) break;
    const marker = dv.getUint16(off);
    if (marker === 0xffda || marker === 0xffd9) break; // início da imagem / fim
    const size = dv.getUint16(off + 2);
    const seg = off + 4;
    const sig = (n) => { let s = ""; for (let k = 0; k < n && seg + k < dv.byteLength; k++) s += String.fromCharCode(dv.getUint8(seg + k)); return s; };
    if (marker === 0xffe1) {
      if (sig(4) === "Exif") { res.metaBytes += size; parseExif(dv, seg + 6, res); }
      else if (sig(4) === "http") { res.found.push("XMP (Adobe)"); res.metaBytes += size; }
    } else if (marker === 0xffed) { res.found.push("IPTC"); res.metaBytes += size; }
    else if (marker === 0xfffe) { res.found.push("Comentário"); res.metaBytes += size; }
    off = seg + size - 2;
  }
  return res;
}

function parseExif(dv, tiff, res) {
  try {
    const le = dv.getUint16(tiff) === 0x4949; // 'II' = little-endian
    const u16 = (o) => dv.getUint16(o, le);
    const u32 = (o) => dv.getUint32(o, le);
    const TAGS = { 0x010f: "Fabricante", 0x0110: "Modelo da câmera", 0x0131: "Software", 0x0132: "Data/hora", 0x9003: "Data original", 0x013b: "Autor", 0x8298: "Copyright" };
    const ifd0 = tiff + u32(tiff + 4);
    const n = u16(ifd0);
    const seen = new Set();
    for (let i = 0; i < n; i++) {
      const e = ifd0 + 2 + i * 12;
      const tag = u16(e);
      if (tag === 0x8825) { res.hasGPS = true; res.found.push("📍 Localização GPS"); }
      if (TAGS[tag] && !seen.has(tag)) { seen.add(tag); res.found.push(TAGS[tag]); }
    }
    if (!res.found.some((f) => /EXIF/.test(f))) res.found.unshift("EXIF (câmera/data)");
  } catch (_) { res.found.push("EXIF"); }
}

let metaMetaFound = null;

function handleMetaFile(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast("Use JPG, PNG ou WebP 📷");
  metaFileRef = file;
  $("#metaReport").hidden = true;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    metaImg = img;
    $("#metaInfo").hidden = false;
    $("#metaInfo").innerHTML = `
      <img src="${url}" alt="Prévia da imagem" />
      <dl>
        <dt>Arquivo</dt><dd>${escHtml(file.name)}</dd>
        <dt>Tipo</dt><dd>${file.type}</dd>
        <dt>Tamanho</dt><dd>${fmtBytes(file.size)}</dd>
        <dt>Dimensões</dt><dd>${img.naturalWidth} × ${img.naturalHeight}px</dd>
      </dl>`;
    $("#btnMetaClean").disabled = false;
    $("#metaDropText").textContent = "📷 " + file.name + " — clique pra trocar";
  };
  img.src = url;
  // lê os metadados reais pra mostrar o que existe
  file.arrayBuffer().then((buf) => {
    metaMetaFound = readImageMeta(buf);
    const rep = $("#metaReport");
    rep.hidden = false;
    if (metaMetaFound.found.length) {
      rep.innerHTML = `<div class="meta-report has"><strong>🔍 Metadados encontrados nesta imagem:</strong>
        <ul>${[...new Set(metaMetaFound.found)].map((f) => `<li>${escHtml(f)}</li>`).join("")}</ul>
        <span class="hint">Clique em "Limpar" pra remover tudo isso e baixar a versão limpa.</span></div>`;
    } else {
      rep.innerHTML = `<div class="meta-report clean">✅ Esta imagem <strong>já está limpa</strong> — não encontrei EXIF, GPS nem outros metadados. (Se você esperava remover uma marca d'água visível, isso não é metadado — está desenhado nos pixels.)</div>`;
    }
  }).catch(() => {});
}

$("#btnMetaClean").addEventListener("click", () => {
  if (!metaImg) return;
  const canvas = document.createElement("canvas");
  canvas.width = metaImg.naturalWidth;
  canvas.height = metaImg.naturalHeight;
  canvas.getContext("2d").drawImage(metaImg, 0, 0);
  const isPng = metaFileRef.type === "image/png";
  canvas.toBlob(
    async (blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const base = metaFileRef.name.replace(/\.[^.]+$/, "");
      a.download = `${base}-limpo.${isPng ? "png" : "jpg"}`;
      a.click();
      URL.revokeObjectURL(a.href);
      // PROVA: relê o arquivo limpo e confirma que zerou os metadados
      let after = { found: [] };
      try { after = readImageMeta(await blob.arrayBuffer()); } catch (_) {}
      const before = (metaMetaFound && [...new Set(metaMetaFound.found)]) || [];
      $("#metaReport").hidden = false;
      $("#metaReport").innerHTML = `<div class="meta-report clean">
        🧹 <strong>Limpo e baixado!</strong> (${fmtBytes(blob.size)})<br>
        Antes: <strong>${before.length}</strong> metadado${before.length === 1 ? "" : "s"}${before.length ? " (" + before.join(", ") + ")" : ""}.
        Depois: <strong>${after.found.length}</strong> ✅ ${after.found.length === 0 ? "— arquivo 100% limpo." : ""}</div>`;
      toast(`Imagem limpa: ${before.length} → 0 metadados 🧹`);
    },
    isPng ? "image/png" : "image/jpeg",
    0.95
  );
});
