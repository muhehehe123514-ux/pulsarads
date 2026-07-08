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

  const checklist = `✅ CHECKLIST DE EXECUÇÃO\n1. Validar demanda no 🔥 Explorador de Ofertas (10+ anúncios ativos do tema = demanda real)\n2. Criar o produto (${format.toLowerCase()}) focado em UMA transformação\n3. Passar a copy no 🚦 Verificador de Palavras Sensíveis\n4. Conferir títulos no 🔢 Contador de Caracteres\n5. Gerar criativos no 🎨 Estúdio + variações no ✍️ Gerador de Headlines\n6. Colar a UTM dinâmica no anúncio\n7. Acompanhar vendas e ROAS no 💰 Rastreador (conectado ao Meta) → escalar o criativo vencedor`;

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
