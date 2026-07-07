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
  const id = location.hash.replace("#", "") || "painel";
  const target = PANELS.includes(id) ? id : "painel";
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === "tool-" + target));
  $$(".side-link").forEach((a) => a.classList.toggle("active", a.dataset.tool === target));
  $("#appSidebar").classList.remove("open");
  window.speechSynthesis?.cancel();
}
window.addEventListener("hashchange", route);
route();

$("#appBurger").addEventListener("click", () => $("#appSidebar").classList.toggle("open"));

// ============================================================
// 1) PAINEL DE CAMPANHAS
// ============================================================
const CAMP_KEY = "pulsar_campaigns";
const loadCamps = () => JSON.parse(localStorage.getItem(CAMP_KEY) || "[]");
const saveCamps = (c) => localStorage.setItem(CAMP_KEY, JSON.stringify(c));

const SAMPLE_CAMPS = [
  { name: "CBO Escala — Oferta A", platform: "Meta Ads", invest: 850, revenue: 2610, clicks: 1240, impr: 61000 },
  { name: "Teste de criativos", platform: "Meta Ads", invest: 320, revenue: 415, clicks: 510, impr: 28500 },
  { name: "Pesquisa fundo de funil", platform: "Google Ads", invest: 610, revenue: 1930, clicks: 430, impr: 9800 },
  { name: "Spark Ads — vídeo 03", platform: "TikTok Ads", invest: 400, revenue: 980, clicks: 890, impr: 74000 },
  { name: "Remarketing 7 dias", platform: "Meta Ads", invest: 180, revenue: 760, clicks: 260, impr: 12400 },
];

function renderPainel() {
  const camps = loadCamps();
  const tInvest = camps.reduce((s, c) => s + c.invest, 0);
  const tRevenue = camps.reduce((s, c) => s + c.revenue, 0);
  const profit = tRevenue - tInvest;
  $("#kpiInvest").textContent = BRL.format(tInvest);
  $("#kpiRevenue").textContent = BRL.format(tRevenue);
  $("#kpiProfit").textContent = BRL.format(profit);
  const delta = $("#kpiProfitDelta");
  if (camps.length === 0) { delta.textContent = ""; }
  else if (profit >= 0) { delta.textContent = "↑ operação no verde"; delta.className = "kpi-delta up"; }
  else { delta.textContent = "↓ operação no vermelho"; delta.className = "kpi-delta down"; }
  $("#kpiRoas").textContent = tInvest > 0 ? (tRevenue / tInvest).toFixed(2) + "x" : "—";

  // tabela
  const tbody = $("#campTable tbody");
  tbody.innerHTML = camps.length
    ? camps.map((c, i) => {
        const lucro = c.revenue - c.invest;
        const roas = c.invest > 0 ? (c.revenue / c.invest).toFixed(2) + "x" : "—";
        const cpc = c.clicks > 0 ? BRL.format(c.invest / c.clicks) : "—";
        const ctr = c.impr > 0 && c.clicks > 0 ? ((c.clicks / c.impr) * 100).toFixed(2) + "%" : "—";
        return `<tr>
          <td>${escHtml(c.name)}</td><td>${escHtml(c.platform)}</td>
          <td>${BRL.format(c.invest)}</td><td>${BRL.format(c.revenue)}</td>
          <td class="${lucro >= 0 ? "pos" : "neg"}">${BRL.format(lucro)}</td>
          <td>${roas}</td><td>${cpc}</td><td>${ctr}</td>
          <td><button class="row-del" data-i="${i}" title="Excluir">✕</button></td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="9" style="text-align:center;color:var(--muted)">Nenhuma campanha ainda.</td></tr>`;

  renderCampChart(camps);
}

function roundedTopRect(x, y, w, h, r) {
  if (h <= 0) return "";
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

function renderCampChart(camps) {
  const root = $("#campChart");
  if (!camps.length) {
    root.innerHTML = `<div class="viz-empty">Adicione campanhas (ou carregue o exemplo) pra ver o gráfico.</div>`;
    return;
  }
  const W = 720, H = 300, mL = 64, mR = 12, mT = 14, mB = 46;
  const iw = W - mL - mR, ih = H - mT - mB;
  const max = Math.max(...camps.map((c) => Math.max(c.invest, c.revenue)), 1);
  const niceMax = Math.ceil(max / Math.pow(10, Math.floor(Math.log10(max)))) * Math.pow(10, Math.floor(Math.log10(max)));
  const y = (v) => mT + ih - (v / niceMax) * ih;

  const n = camps.length;
  const groupW = iw / n;
  const barW = Math.min(34, groupW * 0.32);
  const gap = 2;

  let grid = "";
  for (let g = 0; g <= 4; g++) {
    const gy = mT + (ih * g) / 4;
    const val = niceMax * (1 - g / 4);
    grid += `<line x1="${mL}" y1="${gy}" x2="${W - mR}" y2="${gy}" stroke="${g === 4 ? "var(--axis-line)" : "var(--grid-line)"}" stroke-width="${g === 4 ? 1.5 : 1}"/>`;
    grid += `<text x="${mL - 10}" y="${gy + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="Inter,sans-serif">${val >= 1000 ? (val / 1000).toFixed(val % 1000 ? 1 : 0) + "k" : NUM.format(val)}</text>`;
  }

  let bars = "", hovers = "", labels = "";
  camps.forEach((c, i) => {
    const cx = mL + groupW * i + groupW / 2;
    const x1 = cx - barW - gap / 2;
    const x2 = cx + gap / 2;
    const h1 = ih - (y(c.invest) - mT);
    const h2 = ih - (y(c.revenue) - mT);
    bars += `<path d="${roundedTopRect(x1, y(c.invest), barW, h1, 4)}" fill="var(--series-1)"/>`;
    bars += `<path d="${roundedTopRect(x2, y(c.revenue), barW, h2, 4)}" fill="var(--series-2)"/>`;
    const short = c.name.length > 14 ? c.name.slice(0, 13) + "…" : c.name;
    labels += `<text x="${cx}" y="${H - mB + 20}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="Inter,sans-serif">${escHtml(short)}</text>`;
    hovers += `<rect class="hv" data-i="${i}" x="${mL + groupW * i}" y="${mT}" width="${groupW}" height="${ih}" fill="transparent"/>`;
  });

  root.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de investimento e faturamento por campanha">${grid}${bars}${labels}${hovers}</svg>`;

  root.querySelectorAll(".hv").forEach((r) => {
    r.addEventListener("pointermove", (e) => {
      const c = camps[+r.dataset.i];
      const lucro = c.revenue - c.invest;
      showTip(
        `<strong>${escHtml(c.name)}</strong>
         <span class="tt-row"><span class="lg-swatch" style="background:var(--series-1)"></span>Investido: ${BRL.format(c.invest)}</span>
         <span class="tt-row"><span class="lg-swatch" style="background:var(--series-2)"></span>Faturado: ${BRL.format(c.revenue)}</span>
         <span class="tt-row">Lucro: ${BRL.format(lucro)} · ROAS ${c.invest > 0 ? (c.revenue / c.invest).toFixed(2) : "—"}x</span>`,
        e.clientX, e.clientY
      );
    });
    r.addEventListener("pointerleave", hideTip);
  });
}

$("#campForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const camps = loadCamps();
  camps.push({
    name: $("#cName").value.trim(),
    platform: $("#cPlatform").value,
    invest: parseFloat($("#cInvest").value) || 0,
    revenue: parseFloat($("#cRevenue").value) || 0,
    clicks: parseInt($("#cClicks").value) || 0,
    impr: parseInt($("#cImpr").value) || 0,
  });
  saveCamps(camps);
  e.target.reset();
  renderPainel();
  toast("Campanha adicionada 📊");
});

$("#campTable").addEventListener("click", (e) => {
  const btn = e.target.closest(".row-del");
  if (!btn) return;
  const camps = loadCamps();
  camps.splice(+btn.dataset.i, 1);
  saveCamps(camps);
  renderPainel();
});

$("#btnSample").addEventListener("click", () => {
  saveCamps(SAMPLE_CAMPS);
  renderPainel();
  toast("Dados de exemplo carregados ✨");
});

$("#btnClear").addEventListener("click", () => {
  if (!confirm("Apagar todas as campanhas do painel? Essa ação não tem volta.")) return;
  saveCamps([]);
  renderPainel();
  toast("Painel limpo 🧹");
});

$("#btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(loadCamps(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pulsarads-campanhas.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("JSON exportado ⬇️");
});

renderPainel();

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
});

// ============================================================
// 4) FRAMEWORKS DE COPY
// ============================================================
$("#btnFrameworks").addEventListener("click", () => {
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
const STYLE_MAPS = [
  { name: "Negrito", up: 0x1d5d4, low: 0x1d5ee, dig: 0x1d7ec },
  { name: "Itálico", up: 0x1d608, low: 0x1d622, dig: null },
  { name: "Negrito itálico", up: 0x1d63c, low: 0x1d656, dig: null },
  { name: "Serifado negrito", up: 0x1d400, low: 0x1d41a, dig: 0x1d7ce },
  { name: "Manuscrito", up: 0x1d4d0, low: 0x1d4ea, dig: null },
  { name: "Monoespaçado", up: 0x1d670, low: 0x1d68a, dig: 0x1d7f6 },
  { name: "Contornado", up: 0x1d538, low: 0x1d552, dig: 0x1d7d8 },
];

function styleText(text, map) {
  return [...text]
    .map((ch) => {
      const c = ch.codePointAt(0);
      if (c >= 65 && c <= 90) return String.fromCodePoint(map.up + (c - 65));
      if (c >= 97 && c <= 122) return String.fromCodePoint(map.low + (c - 97));
      if (map.dig && c >= 48 && c <= 57) return String.fromCodePoint(map.dig + (c - 48));
      return ch;
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
  { g: ["#7c3aed", "#0ea5e9"], accent: "#ffffff", ctaBg: "#ffffff", ctaText: "#7c3aed" },
  { g: ["#f97316", "#ec4899"], accent: "#ffffff", ctaBg: "#ffffff", ctaText: "#ea580c" },
  { g: ["#059669", "#10b981"], accent: "#ffffff", ctaBg: "#ffffff", ctaText: "#047857" },
  { g: ["#1e3a8a", "#0f172a"], accent: "#93c5fd", ctaBg: "#3b82f6", ctaText: "#ffffff" },
  { g: ["#b45309", "#78350f"], accent: "#fde68a", ctaBg: "#fbbf24", ctaText: "#78350f" },
];

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

function renderCreative() {
  const canvas = $("#crCanvas");
  const story = $("#crFormat").value === "story";
  canvas.width = 1080;
  canvas.height = story ? 1920 : 1080;
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext("2d");
  const theme = CR_THEMES[+$("#crTheme").value];

  // fundo
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, theme.g[0]);
  grad.addColorStop(1, theme.g[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // círculos decorativos
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(W * 0.9, H * 0.12, W * 0.28, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.08, H * 0.92, W * 0.34, 0, 7); ctx.fill();
  ctx.globalAlpha = 0.08;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.arc(W * 0.9, H * 0.12, W * (0.32 + i * 0.05), 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const cx = W * 0.09;
  let cy = story ? H * 0.32 : H * 0.26;

  // selo
  const badge = $("#crBadge").value.trim();
  if (badge) {
    ctx.font = "700 34px 'Inter', sans-serif";
    const bw = ctx.measureText(badge.toUpperCase()).width + 56;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx, cy - 46, bw, 68, 34);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = theme.accent;
    ctx.fillText(badge.toUpperCase(), cx + 28, cy);
    cy += 110;
  }

  // headline
  const headline = $("#crHeadline").value.trim() || "Sua oferta em destaque";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 92px 'Space Grotesk', 'Inter', sans-serif";
  const hLines = wrapText(ctx, headline, W * 0.82);
  hLines.forEach((l) => { ctx.fillText(l, cx, cy + 66); cy += 106; });
  cy += 26;

  // subtítulo
  const sub = $("#crSub").value.trim();
  if (sub) {
    ctx.font = "400 44px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    wrapText(ctx, sub, W * 0.78).forEach((l) => { ctx.fillText(l, cx, cy + 32); cy += 62; });
    cy += 50;
  } else cy += 30;

  // CTA
  const cta = ($("#crCta").value.trim() || "QUERO AGORA").toUpperCase();
  ctx.font = "700 44px 'Inter', sans-serif";
  const cw = ctx.measureText(cta).width + 120;
  ctx.fillStyle = theme.ctaBg;
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, 108, 54);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = theme.ctaText;
  ctx.fillText(cta, cx + 60, cy + 70);

  // rodapé sutil
  ctx.font = "500 28px 'Inter', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("feito com PulsarAds ⚡ grátis", cx, H - 60);
}

["crFormat", "crTheme", "crBadge", "crHeadline", "crSub", "crCta"].forEach((id) =>
  $("#" + id).addEventListener("input", renderCreative)
);

$("#btnCrDownload").addEventListener("click", () => {
  renderCreative();
  const a = document.createElement("a");
  a.href = $("#crCanvas").toDataURL("image/png");
  a.download = `pulsarads-criativo-${$("#crFormat").value}.png`;
  a.click();
  toast("Criativo baixado 🎨");
});

// fontes carregam depois do primeiro paint — redesenha quando prontas
if (document.fonts?.ready) document.fonts.ready.then(renderCreative);
renderCreative();

// ============================================================
// 12) GERADOR DE ÁUDIO (Web Speech — TTS)
// ============================================================
const synth = window.speechSynthesis;
let voices = [];

function loadVoices() {
  voices = synth ? synth.getVoices() : [];
  const sel = $("#ttsVoice");
  if (!voices.length) {
    sel.innerHTML = `<option>Nenhuma voz disponível neste navegador</option>`;
    return;
  }
  const pt = voices.filter((v) => v.lang.toLowerCase().startsWith("pt"));
  const rest = voices.filter((v) => !v.lang.toLowerCase().startsWith("pt"));
  sel.innerHTML = [...pt, ...rest]
    .map((v) => `<option value="${escHtml(v.name)}">${escHtml(v.name)} (${v.lang})${v.lang.toLowerCase().startsWith("pt") ? " 🇧🇷" : ""}</option>`)
    .join("");
}
if (synth) {
  loadVoices();
  synth.onvoiceschanged = loadVoices;
}

$("#ttsRate").addEventListener("input", () => ($("#ttsRateLbl").textContent = (+$("#ttsRate").value).toFixed(1) + "x"));
$("#ttsPitch").addEventListener("input", () => ($("#ttsPitchLbl").textContent = (+$("#ttsPitch").value).toFixed(1)));

$("#btnTtsPlay").addEventListener("click", () => {
  if (!synth) return toast("Seu navegador não suporta síntese de voz 😕");
  const text = $("#ttsInput").value.trim();
  if (!text) return toast("Escreva um texto primeiro ✍️");
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = voices.find((v) => v.name === $("#ttsVoice").value);
  if (v) u.voice = v;
  u.rate = +$("#ttsRate").value;
  u.pitch = +$("#ttsPitch").value;
  synth.speak(u);
  toast("Reproduzindo 🔊");
});
$("#btnTtsStop").addEventListener("click", () => synth?.cancel());

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

function handleMetaFile(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast("Use JPG, PNG ou WebP 📷");
  metaFileRef = file;
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
}

$("#btnMetaClean").addEventListener("click", () => {
  if (!metaImg) return;
  const canvas = document.createElement("canvas");
  canvas.width = metaImg.naturalWidth;
  canvas.height = metaImg.naturalHeight;
  canvas.getContext("2d").drawImage(metaImg, 0, 0);
  const isPng = metaFileRef.type === "image/png";
  canvas.toBlob(
    (blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const base = metaFileRef.name.replace(/\.[^.]+$/, "");
      a.download = `${base}-limpo.${isPng ? "png" : "jpg"}`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast(`Imagem limpa baixada (${fmtBytes(blob.size)}) 🧹`);
    },
    isPng ? "image/png" : "image/jpeg",
    0.95
  );
});
