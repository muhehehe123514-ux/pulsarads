/* ============================================================
   PulsarAds — Ferramentas 2.0
   Explorador de Ofertas · Rastreador de Vendas · UTMs Dinâmicas
   · Modelador Low Ticket (depende dos globals de app.js)
   ============================================================ */

"use strict";

// ============================================================
// 15) EXPLORADOR DE OFERTAS (Ad Library com filtros + fila)
// ============================================================
const NICHES = [
  { name: "Culinária & receitas", kws: ["bolo no pote", "receitas fit", "marmita congelada", "brigadeiro gourmet", "pão artesanal"] },
  { name: "Confeitaria & doces", kws: ["curso de confeitaria", "doces para vender", "ovo de páscoa gourmet", "donuts recheado", "torta no pote"] },
  { name: "Artesanato & manualidades", kws: ["crochê passo a passo", "laços e tiaras", "velas aromáticas", "biscuit iniciantes", "amigurumi receita"] },
  { name: "Pets", kws: ["adestramento de cães", "receitas naturais para cachorro", "petisco natural pet", "comportamento canino", "banho e tosa em casa"] },
  { name: "Fitness em casa", kws: ["treino em casa", "desafio 30 dias", "treino para glúteos", "mobilidade para iniciantes", "alongamento diário"] },
  { name: "Bem-estar & rotina", kws: ["rotina matinal", "receitas saudáveis semana", "sono de qualidade", "cardápio semanal saudável", "hábitos saudáveis"] },
  { name: "Beleza & autocuidado", kws: ["skincare passo a passo", "design de sobrancelha", "unhas em gel curso", "cronograma capilar", "maquiagem para iniciantes"] },
  { name: "Moda & costura", kws: ["corte e costura iniciante", "moldes de roupa", "customização de roupas", "moda evangélica", "brechó online"] },
  { name: "Maternidade & infantil", kws: ["atividades montessori", "introdução alimentar", "papinhas caseiras", "alfabetização em casa", "rotina do bebê"] },
  { name: "Educação & concursos", kws: ["mapas mentais concursos", "redação nota 1000", "matemática básica", "memorização acelerada", "planner de estudos"] },
  { name: "Idiomas", kws: ["inglês do zero", "espanhol para viagem", "frases em inglês", "listening diário", "vocabulário inglês pdf"] },
  { name: "Música", kws: ["violão para iniciantes", "teclado gospel", "canto afinado", "ukulele passo a passo", "teoria musical simplificada"] },
  { name: "Finanças pessoais", kws: ["planilha de gastos", "organização financeira", "sair das dívidas", "orçamento familiar", "planilha investimentos"] },
  { name: "Marketing & negócios online", kws: ["tráfego pago iniciantes", "loja virtual do zero", "vender no instagram", "criar ebook", "canva para negócios"] },
  { name: "Desenvolvimento pessoal", kws: ["devocional diário", "diário de gratidão", "autoconhecimento exercícios", "planner de hábitos", "meditação guiada"] },
  { name: "Casa & jardinagem", kws: ["horta em vasos", "organização da casa", "suculentas cuidados", "faxina inteligente", "decoração gastando pouco"] },
];

const QUALIFIERS_AUTO = ["ebook", "curso online", "planilha"];
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
  const qual = $("#opQualifier").value;
  const searches = [...kws];
  if (qual) {
    kws.slice(0, 4).forEach((k) => searches.push(`${k} ${qual}`));
  } else {
    kws.slice(0, 3).forEach((k, i) => searches.push(`${k} ${QUALIFIERS_AUTO[i % QUALIFIERS_AUTO.length]}`));
  }
  opQueue = searches.slice(0, 10).map((q) => ({ q, url: adLibUrl(q), opened: false }));
  $("#opScanCard").hidden = false;
  renderOpQueue();
  toast(`${opQueue.length} pesquisas prontas 🔥`);
  $("#opScanCard").scrollIntoView({ behavior: "smooth", block: "start" });
});

function renderOpQueue() {
  const done = opQueue.filter((s) => s.opened).length;
  $("#opScanProgress").textContent = opQueue.length ? `${done}/${opQueue.length} abertas` : "";
  $("#opSearchList").innerHTML = opQueue
    .map(
      (s, i) => `<div class="out-item${s.opened ? " done" : ""}" style="animation-delay:${i * 0.04}s">
        <div><span class="out-tag">Pesquisa ${i + 1}${s.opened ? " · ✅ aberta" : ""}</span>
        <div class="out-text">${escHtml(s.q)}</div></div>
        <div class="out-actions">
          <button class="btn-copy" data-op-open="${i}">Abrir ↗</button>
          <button class="btn-copy" data-op-save="${i}">Salvar</button>
          <button class="btn-copy" data-op-lib="${i}" title="Adicionar à Biblioteca de Ofertas">➕ Biblioteca</button>
        </div>
      </div>`
    )
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
  const open = e.target.closest("[data-op-open]");
  const save = e.target.closest("[data-op-save]");
  const lib = e.target.closest("[data-op-lib]");
  if (lib && window.libAddFromSearch) {
    const s = opQueue[+lib.dataset.opLib];
    window.libAddFromSearch(s.q, s.url, $("#opCountry").value);
  }
  if (open) {
    const s = opQueue[+open.dataset.opOpen];
    s.opened = true;
    window.open(s.url, "_blank", "noopener");
    renderOpQueue();
  }
  if (save) {
    const s = opQueue[+save.dataset.opSave];
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    saved.unshift({ q: s.q, url: s.url });
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved.slice(0, 30)));
    renderOpSaved();
    toast("Pesquisa salva 💾");
  }
});

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
const SALES_KEY = "pulsar_sales";
const loadSales = () => JSON.parse(localStorage.getItem(SALES_KEY) || "[]");
const saveSales = (s) => localStorage.setItem(SALES_KEY, JSON.stringify(s));

const SAMPLE_SALES = [
  { date: "2026-07-05", product: "Ebook Receitas Fit", value: 27, campaign: "CBO Escala — Oferta A", content: "criativo-01" },
  { date: "2026-07-05", product: "Ebook Receitas Fit", value: 27, campaign: "CBO Escala — Oferta A", content: "criativo-03" },
  { date: "2026-07-05", product: "Order bump — Cardápio", value: 9.9, campaign: "CBO Escala — Oferta A", content: "criativo-03" },
  { date: "2026-07-06", product: "Ebook Receitas Fit", value: 27, campaign: "CBO Escala — Oferta A", content: "criativo-03" },
  { date: "2026-07-06", product: "Curso Marmitas", value: 47, campaign: "Pesquisa fundo de funil", content: "anuncio-busca-02" },
  { date: "2026-07-06", product: "Ebook Receitas Fit", value: 27, campaign: "Spark Ads — vídeo 03", content: "video-03" },
  { date: "2026-07-07", product: "Upsell Mentoria Express", value: 97, campaign: "Remarketing 7 dias", content: "carrossel-01" },
  { date: "2026-07-07", product: "Ebook Receitas Fit", value: 27, campaign: "CBO Escala — Oferta A", content: "criativo-01" },
];

function groupBy(arr, keyFn) {
  const map = new Map();
  arr.forEach((item) => {
    const k = keyFn(item) || "(sem atribuição)";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  });
  return map;
}

function renderVendas() {
  const sales = loadSales();
  const camps = loadCamps();
  const totRev = sales.reduce((s, v) => s + v.value, 0);
  const totInvest = camps.reduce((s, c) => s + c.invest, 0);
  $("#slRevenue").textContent = BRL.format(totRev);
  $("#slCount").textContent = sales.length;
  $("#slTicket").textContent = sales.length ? BRL.format(totRev / sales.length) : "—";
  $("#slRoas").textContent = totInvest > 0 && sales.length ? (totRev / totInvest).toFixed(2) + "x" : "—";
  $("#slRoasNote").textContent = totInvest > 0 ? "receita rastreada ÷ investido no painel" : "adicione investimento no 📊 Painel";

  // datalist com as campanhas do painel
  $("#campNames").innerHTML = camps.map((c) => `<option value="${escHtml(c.name)}"></option>`).join("");

  // atribuição por campanha
  const byCamp = [...groupBy(sales, (s) => s.campaign).entries()]
    .map(([name, list]) => ({ name, count: list.length, revenue: list.reduce((a, b) => a + b.value, 0) }))
    .sort((a, b) => b.revenue - a.revenue);

  $("#attrCampTable tbody").innerHTML = byCamp.length
    ? byCamp
        .map((g) => {
          const camp = camps.find((c) => c.name.trim().toLowerCase() === g.name.trim().toLowerCase());
          const invest = camp ? camp.invest : null;
          const roas = invest > 0 ? (g.revenue / invest).toFixed(2) + "x" : "—";
          const cpa = invest > 0 ? BRL.format(invest / g.count) : "—";
          return `<tr><td>${escHtml(g.name)}</td><td>${g.count}</td><td>${BRL.format(g.revenue)}</td>
            <td>${totRev ? ((g.revenue / totRev) * 100).toFixed(1) : 0}%</td>
            <td>${invest != null ? BRL.format(invest) : "—"}</td>
            <td class="${invest > 0 && g.revenue >= invest ? "pos" : ""}">${roas}</td><td>${cpa}</td></tr>`;
        })
        .join("")
    : `<tr><td colspan="7" style="text-align:center;color:var(--muted)">Nenhuma venda ainda.</td></tr>`;

  // atribuição por criativo
  const byContent = [...groupBy(sales, (s) => s.content).entries()]
    .map(([name, list]) => ({ name, count: list.length, revenue: list.reduce((a, b) => a + b.value, 0) }))
    .sort((a, b) => b.revenue - a.revenue);
  $("#attrContentTable tbody").innerHTML = byContent.length
    ? byContent
        .map(
          (g) => `<tr><td>${escHtml(g.name)}</td><td>${g.count}</td><td>${BRL.format(g.revenue)}</td>
          <td>${totRev ? ((g.revenue / totRev) * 100).toFixed(1) : 0}%</td></tr>`
        )
        .join("")
    : `<tr><td colspan="4" style="text-align:center;color:var(--muted)">Nenhuma venda ainda.</td></tr>`;

  // últimas vendas
  $("#salesTable tbody").innerHTML = sales.length
    ? sales
        .map((s, i) => ({ ...s, i }))
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .slice(0, 30)
        .map(
          (s) => `<tr><td>${s.date ? s.date.split("-").reverse().join("/") : "—"}</td>
          <td>${escHtml(s.product)}</td><td>${BRL.format(s.value)}</td>
          <td>${escHtml(s.campaign || "—")}</td><td>${escHtml(s.content || "—")}</td>
          <td><button class="row-del" data-sale="${s.i}" title="Excluir">✕</button></td></tr>`
        )
        .join("")
    : `<tr><td colspan="6" style="text-align:center;color:var(--muted)">Nenhuma venda ainda.</td></tr>`;

  renderSalesChart(byCamp, totRev);
}

function renderSalesChart(byCamp, totRev) {
  const root = $("#salesChart");
  if (!byCamp.length) {
    root.innerHTML = `<div class="viz-empty">Registre vendas (ou carregue o exemplo) pra ver o gráfico.</div>`;
    return;
  }
  const data = byCamp.slice(0, 8);
  const W = 720, H = 280, mL = 64, mR = 12, mT = 26, mB = 46;
  const iw = W - mL - mR, ih = H - mT - mB;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const niceMax = Math.ceil(max / pow) * pow;
  const y = (v) => mT + ih - (v / niceMax) * ih;

  let grid = "";
  for (let g = 0; g <= 4; g++) {
    const gy = mT + (ih * g) / 4;
    const val = niceMax * (1 - g / 4);
    grid += `<line x1="${mL}" y1="${gy}" x2="${W - mR}" y2="${gy}" stroke="${g === 4 ? "var(--axis-line)" : "var(--grid-line)"}" stroke-width="${g === 4 ? 1.5 : 1}"/>`;
    grid += `<text x="${mL - 10}" y="${gy + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="Inter,sans-serif">${val >= 1000 ? (val / 1000).toFixed(1) + "k" : Math.round(val)}</text>`;
  }
  const groupW = iw / data.length;
  const barW = Math.min(46, groupW * 0.5);
  let bars = "", labels = "", hovers = "";
  data.forEach((d, i) => {
    const cx = mL + groupW * i + groupW / 2;
    const by = y(d.revenue);
    bars += `<path d="${roundedTopRect(cx - barW / 2, by, barW, ih - (by - mT), 4)}" fill="var(--series-2)"/>`;
    bars += `<text x="${cx}" y="${by - 7}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-2)" font-family="Inter,sans-serif">${d.revenue >= 1000 ? (d.revenue / 1000).toFixed(1) + "k" : Math.round(d.revenue)}</text>`;
    const short = d.name.length > 13 ? d.name.slice(0, 12) + "…" : d.name;
    labels += `<text x="${cx}" y="${H - mB + 20}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="Inter,sans-serif">${escHtml(short)}</text>`;
    hovers += `<rect class="hv" data-i="${i}" x="${mL + groupW * i}" y="${mT}" width="${groupW}" height="${ih}" fill="transparent"/>`;
  });
  root.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Receita rastreada por campanha">${grid}${bars}${labels}${hovers}</svg>`;
  root.querySelectorAll(".hv").forEach((r) => {
    r.addEventListener("pointermove", (e) => {
      const d = data[+r.dataset.i];
      showTip(
        `<strong>${escHtml(d.name)}</strong>
         <span class="tt-row"><span class="lg-swatch" style="background:var(--series-2)"></span>Receita: ${BRL.format(d.revenue)}</span>
         <span class="tt-row">${d.count} venda${d.count === 1 ? "" : "s"} · ${totRev ? ((d.revenue / totRev) * 100).toFixed(1) : 0}% do total</span>`,
        e.clientX, e.clientY
      );
    });
    r.addEventListener("pointerleave", hideTip);
  });
}

$("#saleForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const sales = loadSales();
  sales.push({
    date: $("#sDate").value || new Date().toISOString().slice(0, 10),
    product: $("#sProduct").value.trim(),
    value: parseFloat($("#sValue").value) || 0,
    campaign: $("#sCampaign").value.trim(),
    content: $("#sContent").value.trim(),
  });
  saveSales(sales);
  e.target.reset();
  renderVendas();
  toast("Venda registrada 💰");
});

$("#salesTable").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-sale]");
  if (!btn) return;
  const sales = loadSales();
  sales.splice(+btn.dataset.sale, 1);
  saveSales(sales);
  renderVendas();
});

$("#btnSlSample").addEventListener("click", () => {
  saveSales(SAMPLE_SALES);
  renderVendas();
  toast("Vendas de exemplo carregadas ✨ (combine com o exemplo do Painel!)");
});

$("#btnSlClear").addEventListener("click", () => {
  if (!confirm("Apagar todas as vendas rastreadas? Essa ação não tem volta.")) return;
  saveSales([]);
  renderVendas();
  toast("Rastreador limpo 🧹");
});

$("#btnSlExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(loadSales(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pulsarads-vendas.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("JSON exportado ⬇️");
});

function parseMoney(s) {
  if (typeof s === "number") return s;
  s = String(s).replace(/[^\d.,-]/g, "").trim();
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return parseFloat(s) || 0;
}

const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

$("#slCsv").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const lines = String(reader.result).trim().split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return toast("CSV vazio ou sem linhas de dados 😕");
    const delim = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
    const norm = (h) => stripAccents(h.toLowerCase()).replace(/^"|"$/g, "").trim();
    const headers = lines[0].split(delim).map(norm);
    const find = (...names) => headers.findIndex((h) => names.some((n) => h.includes(n)));
    const iVal = find("valor", "value", "preco", "price", "amount", "total");
    const iProd = find("produto", "product", "oferta", "item");
    const iCamp = find("utm_campaign", "campanha", "campaign");
    const iCont = find("utm_content", "criativo", "content", "anuncio");
    const iDate = find("data", "date");
    if (iVal < 0) return toast('CSV precisa de uma coluna de valor ("valor", "price"…) 😕');
    const sales = loadSales();
    let added = 0;
    lines.slice(1).forEach((line) => {
      const cols = line.split(delim).map((c) => c.replace(/^"|"$/g, "").trim());
      const value = parseMoney(cols[iVal]);
      if (!value) return;
      sales.push({
        date: iDate >= 0 && cols[iDate] ? cols[iDate].slice(0, 10) : new Date().toISOString().slice(0, 10),
        product: iProd >= 0 ? cols[iProd] : "Importado",
        value,
        campaign: iCamp >= 0 ? cols[iCamp] : "",
        content: iCont >= 0 ? cols[iCont] : "",
      });
      added++;
    });
    saveSales(sales);
    renderVendas();
    toast(`${added} vendas importadas do CSV 📥`);
  };
  reader.readAsText(file, "utf-8");
  e.target.value = "";
});

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

const LT_NAMES = ["Guia Prático", "Método Express", "Planner Completo", "Manual Definitivo", "Kit Turbo", "Desafio Relâmpago"];

$("#btnLtGenerate").addEventListener("click", () => {
  const niche = NICHES[+$("#ltNiche").value];
  const topic = $("#ltTopic").value.trim() || niche.kws[0];
  const format = $("#ltFormat").value;
  const price = parseFloat($("#ltPrice").value);
  const priceFmt = BRL.format(price);
  const offerName = `${pick(LT_NAMES)}: ${cap(topic)}`;
  const bumpPrice = BRL.format(price <= 20 ? 7.9 : 9.9);
  const upsellPrice = BRL.format(price <= 27 ? 67 : 97);
  const budget = Math.max(Math.round(price * 2), 30);

  const offer = `📦 OFERTA\nNome: ${offerName}\nFormato: ${format}\nPreço: ${priceFmt}\nPromessa central: dominar "${topic}" de forma simples, mesmo começando do zero — com resultado visível na primeira semana.\nNicho: ${niche.name}`;

  const adCopy = `Se você quer ${topic} mas não sabe por onde começar, isso aqui é pra você.\n\nO ${offerName} é um ${format.toLowerCase()} direto ao ponto: sem enrolação, sem teoria infinita — só o passo a passo que funciona.\n\n✅ Acesso imediato\n✅ Linguagem simples, pra aplicar hoje\n✅ Por menos que uma pizza: ${priceFmt}\n\n👉 Toque em "Saiba mais" e garanta o seu.`;

  const headlines = `1. ${cap(topic)}: o passo a passo completo por ${priceFmt}\n2. O ${format.toLowerCase()} que descomplica ${topic} de uma vez\n3. Comece ${topic} hoje — acesso imediato por ${priceFmt}`;

  const funnel = `🛒 FUNIL SUGERIDO\n1. Anúncio (Meta Ads) → página de vendas simples: promessa + 3 provas + preço + botão\n2. Checkout: order bump de ${bumpPrice} (complemento rápido: checklist, bônus, templates)\n3. Pós-compra: upsell de ${upsellPrice} (versão avançada, combo ou mentoria gravada)\n4. Página de obrigado: entrega imediata + convite pro grupo/lista\nMeta do funil: bump + upsell pagarem o tráfego; o produto principal vira o lucro.`;

  const campaign = `🚀 ESTRUTURA DE CAMPANHA (Meta Ads)\nCampanha de vendas (CBO) — orçamento inicial R$ ${budget}/dia\nConjunto 1: público aberto (só país + idioma)\nConjunto 2: interesses ligados a "${niche.name}"\nConjunto 3: aberto com criativo em outro estilo (ex.: UGC)\n4 criativos por conjunto: 2 imagens (gere no 🎨 Estúdio) + 2 vídeos simples\nRegra dos 3 dias: CPA abaixo de ${BRL.format(price * 0.5)}? Escala 20%. Acima de ${BRL.format(price)}? Pausa o criativo.`;

  const utm = `🎯 UTM PRONTA (cole no campo "Parâmetros de URL" do anúncio)\n${MACROS.meta.suffix}`;

  const checklist = `✅ CHECKLIST DE EXECUÇÃO\n1. Validar demanda no 🔥 Explorador de Ofertas (10+ anúncios ativos do tema = demanda real)\n2. Criar o produto (${format.toLowerCase()}) focado em UMA transformação\n3. Passar a copy no 🚦 Verificador de Palavras Sensíveis\n4. Conferir títulos no 🔢 Contador de Caracteres\n5. Gerar criativos no 🎨 Estúdio + variações no ✍️ Gerador de Headlines\n6. Colar a UTM dinâmica no anúncio\n7. Registrar cada venda no 💰 Rastreador → escalar o criativo vencedor`;

  $("#ltOut").innerHTML = [
    [offer, "1 · A oferta"],
    [adCopy, "2 · Copy do anúncio"],
    [headlines, "3 · Headlines pra testar"],
    [funnel, "4 · Funil"],
    [campaign, "5 · Campanha"],
    [utm, "6 · Rastreamento"],
    [checklist, "7 · Checklist de execução"],
  ]
    .map(([t, tag], i) => outItem(t, tag, i))
    .join("");
  toast("Plano low ticket montado 🧭");
});
