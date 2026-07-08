/* ============================================================
   PulsarAds — ✨ Modelar Oferta (v2)
   Oferta-base → novos ângulos → promessa → headline/sub →
   página de vendas editável com: paletas de cores, várias fontes,
   preview celular/tablet, upload por clique nas imagens vazias,
   avatares nos depoimentos, adicionar/remover seções e link de
   checkout nos botões. Download + publicação no Netlify.
   ============================================================ */

"use strict";

const md = {
  idx: null, offer: null, ideas: [], idea: null, proms: [], prom: null,
  headline: "", sub: "", brand: "Sua Marca",
  palette: 0, fontHead: 0, fontBody: 0, checkout: "",
};

// ---------- passo 1: escolher a oferta-base ----------
function mdRefreshOffers() {
  const offers = loadOffers();
  $("#mdOffer").innerHTML = offers.length
    ? offers.map((o, i) => `<option value="${i}">${escHtml(o.name)}</option>`).join("")
    : `<option value="">— minere ofertas reais na 🔥 Explorador / 📚 Biblioteca primeiro —</option>`;
  mdShowBase();
}

function mdShowBase() {
  const o = loadOffers()[+$("#mdOffer").value];
  const box = $("#mdBaseDesc");
  if (!o) { box.hidden = true; return; }
  box.hidden = false;
  box.textContent = o.desc || o.notes || `Oferta "${o.name}" (sem descrição salva — os ângulos usam o nome e o nicho).`;
}
$("#mdOffer").addEventListener("change", mdShowBase);
window.addEventListener("hashchange", () => { if (location.hash === "#modelar") mdRefreshOffers(); });
mdRefreshOffers();

window.startModelagem = (idx) => {
  mdRefreshOffers();
  $("#mdOffer").value = idx;
  mdShowBase();
  location.hash = "#modelar";
  toast("Oferta carregada — gere os novos ângulos ✨");
};

// ============================================================
// passo 2: NOVOS ÂNGULOS pra novos públicos (v2 — muito melhores)
// ============================================================
const MD_PUBLICS = [
  "mães que não têm tempo", "quem está começando do absoluto zero", "pessoas 50+ que acham que 'é tarde demais'",
  "homens práticos que odeiam enrolação", "jovens de 18 a 25 querendo o primeiro dinheiro", "quem precisa de uma renda extra ainda esse mês",
  "o público cristão", "quem só tem 15 minutos por dia", "quem já comprou de tudo e nada funcionou",
  "profissionais ocupados", "iniciantes que têm medo de errar", "quem quer resultado sem aparecer/gravar vídeo",
];

// cada ângulo é um "gancho de venda" completo (nome do produto + promessa + público)
const MD_ANGLES = [
  (t, p) => `O atalho de 7 dias: "${cap(t)}" condensado no essencial pra ${p} verem o 1º resultado já na primeira semana.`,
  (t, p) => `O anti-erro: "Os 5 erros que travam ${p} em ${t}" — ângulo de curiosidade + medo, converte no tráfego frio.`,
  (t, p) => `Do zero mastigado: "${cap(t)}" explicado sem UM termo técnico, no passo a passo à prova de iniciante — feito pra ${p}.`,
  (t, p) => `O método com nome próprio: batize o sistema (ex.: "Método Pulso") e venda o MÉTODO, não o tema — autoridade instantânea com ${p}.`,
  (t, p) => `Encaixa na rotina: "${cap(t)} em 15 min/dia" — mostra exatamente onde ${p} encaixam na manhã, no intervalo ou à noite.`,
  (t, p) => `Sem a parte chata: "${cap(t)} sem a etapa que todo mundo odeia" — você promete remover a maior fricção que ${p} enfrentam.`,
  (t, p) => `A transformação visível: antes/depois real de quem aplicou "${t}" — prova concreta que ${p} conseguem enxergar em si.`,
  (t, p) => `O desafio guiado: transforme "${t}" num desafio de 21 dias com check-list diário — gamifica e segura ${p} até o resultado.`,
  (t, p) => `O kit pra imprimir: "${cap(t)}" em material físico-digital (PDF pra imprimir) — ${p} amam algo palpável na mão.`,
  (t, p) => `A objeção-título: "E se você acha que não tem tempo/talento pra ${t}?" — quebra na headline o que mais impede ${p} de comprar.`,
  (t, p) => `O upgrade de status: posicione "${t}" como o que faz ${p} serem admirados por quem está por perto.`,
  (t, p) => `O combo família: versão pra fazer em dupla/família — dobra o valor percebido e o motivo de compra pra ${p}.`,
];

$("#btnMdIdeas").addEventListener("click", () => {
  const offers = loadOffers();
  md.idx = +$("#mdOffer").value;
  md.offer = offers[md.idx];
  if (!md.offer) return toast("Salve uma oferta real na 📚 Biblioteca primeiro");
  const topic = md.offer.name.toLowerCase();
  const pubs = [...MD_PUBLICS].sort(() => Math.random() - 0.5);
  const angles = [...MD_ANGLES].sort(() => Math.random() - 0.5);
  md.ideas = angles.slice(0, 8).map((fn, i) => fn(topic, pubs[i % pubs.length]));
  md.idea = null;
  renderPickList("#mdIdeas", md.ideas, "md-idea");
  $("#mdIdeasCard").hidden = false;
  $("#mdPromCard").hidden = true;
  $("#mdHeadCard").hidden = true;
  $("#mdPageCard").hidden = true;
  $("#mdIdeasCard").scrollIntoView({ behavior: "smooth", block: "start" });
});

function renderPickList(sel, items, attr, recommended = -1) {
  $(sel).innerHTML = items
    .map(
      (t, i) => `<button class="pick-item" data-${attr}="${i}">
        ${i === recommended ? '<span class="pk-badge">✨ RECOMENDADA</span>' : ""}${escHtml(t)}
      </button>`
    )
    .join("");
}

$("#mdIdeas").addEventListener("click", (e) => {
  const b = e.target.closest("[data-md-idea]");
  if (!b) return;
  $$("#mdIdeas .pick-item").forEach((x) => x.classList.toggle("picked", x === b));
  md.idea = md.ideas[+b.dataset.mdIdea];
  mdGenProms();
});

$("#btnMdPickIdea").addEventListener("click", () => {
  // heurística: prioriza ângulos de fricção/erro/atalho (convertem melhor no frio)
  let best = md.ideas.findIndex((t) => /anti-erro|erro|sem a parte|atalho|7 dias|objeção/i.test(t));
  if (best < 0) best = 0;
  renderPickList("#mdIdeas", md.ideas, "md-idea", best);
  $$("#mdIdeas .pick-item")[best].classList.add("picked");
  md.idea = md.ideas[best];
  toast("O site escolheu o ângulo com maior potencial ✨");
  mdGenProms();
});

// ============================================================
// passo 3: PROMESSAS (v2 — específicas, com prazo e quebra de objeção)
// ============================================================
function mdGenProms() {
  const raw = md.offer.name;
  const t = raw.toLowerCase();
  const price = md.offer.price ? "R$ " + (+md.offer.price).toFixed(2).replace(".", ",") : "R$ 27,00";
  const nicheName = md.offer.niche >= 0 && NICHES[md.offer.niche] ? NICHES[md.offer.niche].name.toLowerCase() : "sua área";

  // banco grande e variado; sorteia 6 estruturas diferentes
  const bank = [
    `Saia do zero e tenha seu primeiro resultado em ${t} em até 7 dias — mesmo sem nenhuma experiência e com só 15 minutos por dia.`,
    `Um passo a passo tão direto que você aplica hoje e já vê diferença essa semana, sem depender de talento, tempo sobrando ou equipamento caro.`,
    `Pare de juntar informação solta: aqui você recebe o caminho exato, na ordem certa, pra dominar ${t} sem se perder no meio.`,
    `O método que corta 80% do que não importa e te entrega só o que faz ${nicheName} realmente acontecer — resultado rápido, sem enrolação.`,
    `Destrave o que trava 9 em cada 10 iniciantes: você vai saber exatamente o que fazer quando empacar, com apoio pra tirar toda dúvida.`,
    `Tudo pronto pra começar agora: material completo, acesso imediato e garantia de 7 dias — por menos que uma pizza (${price}).`,
    `Transforme ${t} numa rotina simples de encaixar no seu dia — e prove pra você mesmo que dá certo, com risco zero graças à garantia.`,
    `De frustrado a confiante: você troca a tentativa e erro por um mapa testado, feito pra quem quer resultado sem complicação.`,
    `A forma mais rápida e barata de finalmente ter ${t} funcionando — mesmo que você já tenha tentado antes e desistido.`,
  ];
  md.proms = [...bank].sort(() => Math.random() - 0.5).slice(0, 6);
  md.prom = null;
  renderPickList("#mdProms", md.proms, "md-prom");
  $("#mdPromCard").hidden = false;
  $("#mdPromCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("#mdProms").addEventListener("click", (e) => {
  const b = e.target.closest("[data-md-prom]");
  if (!b) return;
  $$("#mdProms .pick-item").forEach((x) => x.classList.toggle("picked", x === b));
  md.prom = md.proms[+b.dataset.mdProm];
  mdGenHeads();
});

$("#btnMdPickProm").addEventListener("click", () => {
  // heurística: prioriza promessa com prazo concreto + quebra de objeção
  let best = md.proms.findIndex((t) => /7 dias|15 minutos|garantia|risco zero|hoje/i.test(t));
  if (best < 0) best = 0;
  renderPickList("#mdProms", md.proms, "md-prom", best);
  $$("#mdProms .pick-item")[best].classList.add("picked");
  md.prom = md.proms[best];
  toast("O site escolheu a promessa mais forte ✨");
  mdGenHeads();
});

// ============================================================
// passo 4: headline & subheadline
// ============================================================
function mdGenHeads() {
  const t = md.offer.name;
  const H = [
    `${cap(t)}: ${md.prom.split(" — ")[0].split(":").pop().replace(/\.$/, "").trim()}`,
    `Finalmente: ${t.toLowerCase()} do jeito simples, com resultado em dias — não em meses`,
    `O caminho mais curto pra ${t.toLowerCase()} (mesmo que você já tenha tentado antes)`,
    `${cap(t)} sem enrolação: o passo a passo que funciona pra quem começa do zero`,
  ];
  const S = [
    `${md.prom} Acesso imediato após a compra.`,
    `Um método testado, direto ao ponto, com garantia incondicional de 7 dias. O risco é todo nosso.`,
    `Material completo pra você aplicar hoje mesmo — e ver o primeiro resultado ainda essa semana.`,
  ];
  md.headline = pick(H);
  md.sub = pick(S);
  $("#mdHeadOut").innerHTML = [
    outItem(md.headline, "Headline"),
    outItem(md.sub, "Subheadline", 1),
  ].join("");
  $("#mdHeadCard").hidden = false;
  $("#mdHeadCard").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("#btnMdRegen").addEventListener("click", mdGenHeads);

// ============================================================
// passo 5: PÁGINA DE VENDAS — paletas, fontes e seções
// ============================================================
const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "minha-oferta";

// paletas (bg = gradiente do hero/oferta; btn = botão; accent = destaques)
const MD_PALETTES = [
  { name: "Roxo Pulsar", bg1: "#12102b", bg2: "#3b1d7a", accent: "#a78bfa", btn: "#22c55e", btnText: "#ffffff", paper: "#ffffff", card: "#f6f6fb", ink: "#1c1c28" },
  { name: "Verde Dinheiro", bg1: "#052e1a", bg2: "#0f766e", accent: "#34d399", btn: "#f59e0b", btnText: "#3b2600", paper: "#ffffff", card: "#f1faf5", ink: "#12241b" },
  { name: "Azul Confiança", bg1: "#0b1e3f", bg2: "#1d4ed8", accent: "#60a5fa", btn: "#22c55e", btnText: "#ffffff", paper: "#ffffff", card: "#f2f6fc", ink: "#0f1e33" },
  { name: "Vermelho Urgência", bg1: "#3b0a0a", bg2: "#b91c1c", accent: "#fca5a5", btn: "#f59e0b", btnText: "#3b1400", paper: "#ffffff", card: "#fdf3f2", ink: "#2a0f0f" },
  { name: "Preto & Ouro", bg1: "#0a0a0a", bg2: "#1c1917", accent: "#f5b301", btn: "#f5b301", btnText: "#1a1400", paper: "#0f0f12", card: "#1a1a20", ink: "#f3f3f5" },
  { name: "Rosa Elegante", bg1: "#3d0a2a", bg2: "#be185d", accent: "#f9a8d4", btn: "#22c55e", btnText: "#ffffff", paper: "#fffafc", card: "#fdf2f8", ink: "#2a1020" },
  { name: "Laranja Energia", bg1: "#3b1a02", bg2: "#ea580c", accent: "#fdba74", btn: "#16a34a", btnText: "#ffffff", paper: "#ffffff", card: "#fff6ee", ink: "#2a1608" },
  { name: "Clean Claro", bg1: "#111827", bg2: "#4b5563", accent: "#6366f1", btn: "#6366f1", btnText: "#ffffff", paper: "#ffffff", card: "#f4f4f8", ink: "#1c1c28" },
];

const MD_FONTS = [
  { name: "Poppins (moderna)", stack: "'Poppins',system-ui,sans-serif" },
  { name: "Montserrat (forte)", stack: "'Montserrat',system-ui,sans-serif" },
  { name: "Playfair Display (elegante)", stack: "'Playfair Display',Georgia,serif" },
  { name: "Oswald (impacto)", stack: "'Oswald',Impact,sans-serif" },
  { name: "Lora (editorial)", stack: "'Lora',Georgia,serif" },
  { name: "Roboto (limpa)", stack: "'Roboto',system-ui,sans-serif" },
  { name: "Sistema (rápida)", stack: "system-ui,-apple-system,'Segoe UI',sans-serif" },
];

// popula selects de estilo
$("#mdPalette").innerHTML = MD_PALETTES.map((p, i) => `<option value="${i}">${p.name}</option>`).join("");
$("#mdFontHead").innerHTML = MD_FONTS.map((f, i) => `<option value="${i}">${f.name}</option>`).join("");
$("#mdFontBody").innerHTML = MD_FONTS.map((f, i) => `<option value="${i}"${i === 5 ? " selected" : ""}>${f.name}</option>`).join("");
$("#mdFontBody").value = "5";

function mdVarsCss() {
  const p = MD_PALETTES[md.palette];
  const fh = MD_FONTS[md.fontHead].stack, fb = MD_FONTS[md.fontBody].stack;
  const dark = md.palette === 4; // Preto & Ouro tem corpo escuro
  return `:root{--bg1:${p.bg1};--bg2:${p.bg2};--accent:${p.accent};--btn:${p.btn};--btn-text:${p.btnText};` +
    `--paper:${p.paper};--card:${p.card};--ink:${p.ink};--muted:${dark ? "#b9b9c6" : "#5a5a70"};` +
    `--border:${dark ? "#2a2a33" : "#e6e6f2"};--font-head:${fh};--font-body:${fb};}`;
}

// aplica paleta/fonte no preview (e no HTML salvo) sem regerar a página
function mdApplyStyle() {
  const doc = $("#mdFrame").contentDocument;
  if (!doc) return;
  let st = doc.getElementById("md-vars");
  if (!st) { st = doc.createElement("style"); st.id = "md-vars"; doc.head.appendChild(st); }
  st.textContent = mdVarsCss();
  // fontes do Google (garante que o link existe)
  if (!doc.getElementById("md-fonts")) {
    const l = doc.createElement("link");
    l.id = "md-fonts"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&family=Montserrat:wght@400;600;800&family=Playfair+Display:wght@600;800&family=Oswald:wght@500;700&family=Lora:wght@400;600&family=Roboto:wght@400;700&display=swap";
    doc.head.appendChild(l);
  }
}
["mdPalette", "mdFontHead", "mdFontBody"].forEach((id) =>
  $("#" + id).addEventListener("change", () => {
    md.palette = +$("#mdPalette").value;
    md.fontHead = +$("#mdFontHead").value;
    md.fontBody = +$("#mdFontBody").value;
    mdApplyStyle();
    toast("Estilo aplicado 🎨");
  })
);

// link de checkout dos botões
$("#mdCheckout").addEventListener("input", () => {
  md.checkout = $("#mdCheckout").value.trim();
  const doc = $("#mdFrame").contentDocument;
  if (!doc || !md.checkout) return;
  doc.querySelectorAll("a[data-buy]").forEach((a) => { a.href = md.checkout; a.removeAttribute("onclick"); a.target = "_blank"; });
});

// ---------- blocos reutilizáveis da página ----------
const SLOT = (extra = "") => `<div class="img-slot${extra ? " " + extra : ""}" data-slot><span>📷 Clique pra enviar uma foto</span></div>`;
const AVATAR = (letra) => `<div class="img-slot avatar-slot" data-slot data-avatar><span>${letra}</span></div>`;

function secCarousel(n = 5) {
  return `<section data-sec="carousel"><div class="wrap">
<h2>Veja o que você vai receber 👀</h2>
<div class="carousel">${SLOT().repeat(n)}</div>
</div></section>`;
}
function secBanner() {
  return `<section data-sec="banner" class="banner"><div class="wrap">
<div class="img-slot banner-slot" data-slot><span>📷 Clique pra enviar o banner</span></div>
</div></section>`;
}
function secImage() {
  return `<section data-sec="image"><div class="wrap" style="text-align:center">${SLOT("solo")}</div></section>`;
}
function secHeading() {
  return `<section data-sec="heading"><div class="wrap"><h2>Novo título — clique pra editar</h2></div></section>`;
}
function secText() {
  return `<section data-sec="text"><div class="wrap"><p class="long">Clique aqui pra escrever um texto mais longo: conte a história da sua oferta, explique o método, mostre por que funciona e por que a pessoa precisa disso agora. Capriche — é aqui que você convence.</p></div></section>`;
}
function secTestimonials(list) {
  const dep = list || [
    ["Ana P.", "A", "Eu não sabia nada e em uma semana já estava aplicando tudo. Direto ao ponto!"],
    ["Carlos M.", "C", "Achei que seria só mais um PDF, mas é completíssimo. Os bônus já valem o preço."],
    ["Juliana R.", "J", "Comprei, apliquei e voltei pra comprar o combo. O suporte é um diferencial enorme."],
  ];
  return `<section data-sec="testimonials" class="alt"><div class="wrap">
<h2>Quem comprou, aprova ⭐</h2>
<!-- IMPORTANTE: troque pelos depoimentos REAIS dos seus clientes (foto + nome + texto) -->
<div class="grid3">
${dep.map(([n, l, tx]) => `<div class="card dep">${AVATAR(l)}<span class="stars">★★★★★</span><p>"${escHtml(tx)}"</p><b>${escHtml(n)}</b></div>`).join("\n")}
</div></div></section>`;
}
function secCta(price) {
  return `<section data-sec="cta" style="text-align:center"><div class="wrap">
<a class="btn" data-buy href="#" onclick="return false">QUERO GARANTIR O MEU 🔥</a>
</div></section>`;
}

function buildSalesPage() {
  const o = md.offer;
  const price = o.price ? (+o.price).toFixed(2).replace(".", ",") : "27,00";
  const name = o.name;
  const nicheName = o.niche >= 0 && NICHES[o.niche] ? NICHES[o.niche].name : "seu nicho";
  const bonus = [
    ["🎁 Bônus 1 — Guia de Início Rápido", `Um resumo de 1 página pra você aplicar ${name.toLowerCase()} hoje mesmo, sem ler tudo antes.`],
    ["🎁 Bônus 2 — Checklist Imprimível", `Checklist passo a passo pra acompanhar seu progresso em ${nicheName.toLowerCase()} sem se perder.`],
    ["🎁 Bônus 3 — Grupo VIP de Suporte", "Acesso ao grupo exclusivo pra tirar dúvidas e receber atualizações do material."],
  ];
  const faq = [
    ["Como recebo o material?", "O acesso é enviado pro seu e-mail imediatamente após a confirmação do pagamento. É 100% digital."],
    ["Preciso de experiência?", "Não! O material foi feito pra iniciantes: tudo é explicado passo a passo, sem termos difíceis."],
    ["Em quanto tempo vejo resultado?", "Seguindo o passo a passo, os primeiros resultados costumam aparecer já na primeira semana."],
    ["E se eu não gostar?", "Você tem 7 dias de garantia incondicional: basta pedir e devolvemos 100% do valor, sem perguntas."],
    ["O pagamento é seguro?", "Sim — o checkout é processado por plataforma de pagamento com criptografia de ponta a ponta."],
  ];
  const img = o.img && typeof imgById === "function" ? imgById(o.img) : null;
  const heroImg = img ? `<img src="${img.dataUrl}" alt="${escHtml(name)}">` : `<span>📷 Clique pra enviar a foto do produto</span>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(name)} — ${escHtml(md.headline)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link id="md-fonts" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&family=Montserrat:wght@400;600;800&family=Playfair+Display:wght@600;800&family=Oswald:wght@500;700&family=Lora:wght@400;600&family=Roboto:wght@400;700&display=swap">
<style id="md-vars">${mdVarsCss()}</style>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font-body);color:var(--ink);line-height:1.6;background:var(--paper)}
.wrap{max-width:960px;margin:0 auto;padding:0 20px}section{padding:56px 0}
h1,h2,h3{font-family:var(--font-head);line-height:1.15}
h2{font-size:clamp(24px,4vw,34px);text-align:center;margin-bottom:28px}
.hero{background:linear-gradient(160deg,var(--bg1),var(--bg2));color:#fff;text-align:center;padding:72px 0}
.hero h1{font-size:clamp(30px,5.5vw,52px);margin-bottom:18px}.hero p{font-size:clamp(16px,2.2vw,20px);opacity:.92;max-width:640px;margin:0 auto 30px}
.img-slot{min-height:220px;max-width:420px;margin:26px auto;border:3px dashed rgba(150,150,170,.5);border-radius:16px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;text-align:center;overflow:hidden;background:rgba(150,150,170,.08);cursor:pointer}
.hero .img-slot{border-color:rgba(255,255,255,.4);color:rgba(255,255,255,.8);background:rgba(255,255,255,.06)}
.img-slot img{width:100%;height:100%;object-fit:cover;display:block}
.img-slot.solo{max-width:640px;min-height:300px}
.banner-slot{max-width:100%;min-height:180px}
.avatar-slot{width:66px;height:66px;min-height:0;max-width:none;border-radius:50%;margin:0 auto 10px;font-size:26px;font-weight:800;color:var(--accent);background:rgba(150,150,170,.14)}
.btn{display:inline-block;background:var(--btn);color:var(--btn-text);font-weight:800;font-size:18px;padding:18px 42px;border-radius:999px;text-decoration:none;box-shadow:0 12px 34px rgba(0,0,0,.22);transition:transform .2s}.btn:hover{transform:translateY(-2px)}
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:26px;text-align:center}
.card h3{margin-bottom:10px;font-size:18px}
.alt{background:var(--card)}
.long{font-size:17px;max-width:760px;margin:0 auto;text-align:left;color:var(--ink)}
.offer{background:linear-gradient(160deg,var(--bg1),var(--bg2));color:#fff;text-align:center}
.offer .price{font-size:56px;font-weight:800;margin:10px 0}.offer .old{text-decoration:line-through;opacity:.6;font-size:20px}
#timer{font-size:34px;font-weight:800;letter-spacing:2px;background:rgba(255,255,255,.12);display:inline-block;padding:10px 26px;border-radius:12px;margin:14px 0}
.carousel{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:10px}
.carousel .img-slot{min-width:240px;height:240px;margin:0;scroll-snap-align:center}
.banner .wrap{max-width:1080px}
.dep{font-style:italic}.dep b{display:block;margin-top:12px;font-style:normal;color:var(--accent)}
.gar{display:flex;gap:22px;align-items:center;max-width:720px;margin:0 auto;background:var(--card);border:2px solid var(--btn);border-radius:18px;padding:26px}
.gar .g7{font-size:52px}
details{max-width:720px;margin:0 auto 10px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 20px}summary{font-weight:700;cursor:pointer}details p{margin-top:10px;color:var(--muted)}
footer{background:var(--bg1);color:rgba(255,255,255,.7);text-align:center;padding:26px;font-size:14px}
.stars{color:#f5b301;letter-spacing:2px}
</style></head>
<body>
<section data-sec="hero" class="hero"><div class="wrap">
<h1>${escHtml(md.headline)}</h1>
<p>${escHtml(md.sub)}</p>
<div class="img-slot" data-slot>${heroImg}</div>
<a class="btn" data-buy href="#oferta">QUERO GARANTIR O MEU 🔥</a>
</div></section>

<section data-sec="receber"><div class="wrap">
<h2>O que você vai receber 📦</h2>
<div class="grid3">
<div class="card"><h3>Material completo</h3><p>${escHtml(name)} inteiro, organizado em módulos simples pra você seguir sem se perder — do primeiro passo ao resultado.</p></div>
<div class="card"><h3>Acesso imediato</h3><p>Pagou, chegou: o material cai no seu e-mail em minutos e é seu pra sempre, pra acessar de qualquer aparelho.</p></div>
<div class="card"><h3>Atualizações incluídas</h3><p>Toda melhoria futura do material chega pra você automaticamente, sem pagar nada a mais.</p></div>
</div></div></section>

<section data-sec="porque" class="alt"><div class="wrap">
<h2>Por que escolher nosso material? 💎</h2>
<div class="grid3">
<div class="card"><h3>⚡ Direto ao ponto</h3><p>Nada de enrolação: só o que funciona, explicado em linguagem simples pra aplicar no mesmo dia.</p></div>
<div class="card"><h3>🧭 Passo a passo real</h3><p>Você nunca fica perdido: cada etapa diz exatamente o que fazer, na ordem certa.</p></div>
<div class="card"><h3>🛟 Suporte de verdade</h3><p>Ficou com dúvida? Nosso canal de suporte responde você — ninguém fica pra trás.</p></div>
</div></div></section>

<section data-sec="bonus"><div class="wrap">
<h2>E ainda tem bônus 🎁</h2>
<div class="grid3">
${bonus.map(([t, d]) => `<div class="card"><h3>${escHtml(t)}</h3><p>${escHtml(d)}</p></div>`).join("\n")}
</div></div></section>

<section data-sec="oferta" class="offer" id="oferta"><div class="wrap">
<h2>Oferta por tempo limitado ⏰</h2>
<p>Essa condição especial expira em:</p>
<div id="timer">15:00</div>
<p class="old">De R$ ${(parseFloat(price.replace(",", ".")) * 3).toFixed(2).replace(".", ",")}</p>
<p class="price">R$ ${price}</p>
<p style="opacity:.85;margin-bottom:24px">Pagamento único · Acesso imediato · Garantia de 7 dias</p>
<a class="btn" data-buy href="#" onclick="alert('Defina o link do checkout no campo 🔗 acima, ou clique neste botão com a edição ligada.');return false">COMPRAR AGORA POR R$ ${price} →</a>
</div></section>

${secCarousel(5)}

${secTestimonials()}

<section data-sec="garantia"><div class="wrap">
<div class="gar"><div class="g7">🛡️</div><div>
<h3 style="margin-bottom:8px">Garantia incondicional de 7 dias</h3>
<p>Se por qualquer motivo você achar que o material não é pra você, é só mandar um e-mail em até 7 dias e devolvemos 100% do seu dinheiro. Sem perguntas, sem burocracia. O risco é todo nosso.</p>
</div></div></div></section>

<section data-sec="faq" class="alt"><div class="wrap">
<h2>Perguntas frequentes ❓</h2>
${faq.map(([q, a]) => `<details><summary>${escHtml(q)}</summary><p>${escHtml(a)}</p></details>`).join("\n")}
</div></section>

<footer data-sec="footer">© 2026 ${escHtml(md.brand)}. Todos os direitos reservados.</footer>
<script>
(function(){var s=15*60,el=document.getElementById('timer');setInterval(function(){if(s<=0)return;s--;var m=String(Math.floor(s/60)).padStart(2,'0'),x=String(s%60).padStart(2,'0');el.textContent=m+':'+x;},1000);})();
</script>
</body></html>`;
}

$("#btnMdPage").addEventListener("click", () => {
  if (!md.offer) return toast("Comece pelo passo 1 ✨");
  if (!md.prom) { md.prom = md.proms[0] || ""; }
  if (!md.headline) mdGenHeads();
  md.palette = +$("#mdPalette").value;
  md.fontHead = +$("#mdFontHead").value;
  md.fontBody = +$("#mdFontBody").value;
  const html = buildSalesPage();
  const frame = $("#mdFrame");
  frame.srcdoc = html;
  frame.addEventListener("load", mdSetupFrame, { once: true });
  $("#mdPageCard").hidden = false;
  $("#mdPublishOut").innerHTML = "";
  $("#mdPageCard").scrollIntoView({ behavior: "smooth", block: "start" });
  toast("Página de vendas gerada 🚀 Edite à vontade!");
});

// ============================================================
// EDIÇÃO do preview: texto, imagens por clique, seções, links
// ============================================================
let mdEditing = true;

function mdSetupFrame() {
  const doc = $("#mdFrame").contentDocument;
  if (!doc) return;
  mdApplyStyle();
  mdDecorate();
  // arrastar imagem do navegador direto num slot
  doc.addEventListener("dragover", (e) => e.preventDefault());
  doc.addEventListener("drop", async (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f || !/^image\//.test(f.type)) return;
    const slot = e.target.closest(".img-slot") || doc.querySelector(".img-slot");
    if (!slot) return;
    const url = await window.compressImageFile(f);
    mdFillSlot(slot, url);
  });
  // cliques dentro da página (imagens, botões, toolbar de seção)
  doc.addEventListener("click", (e) => {
    if (!mdEditing) return;
    if (e.target.closest("[data-md-grip]")) return; // clique no puxador de arraste: ignora
    const slot = e.target.closest(".img-slot");
    if (slot) { e.preventDefault(); mdChooseImage(slot); return; }
    const buy = e.target.closest("a.btn, a[data-buy]");
    if (buy) { e.preventDefault(); mdSetButtonLink(buy); return; }
    const ui = e.target.closest("[data-md-act]");
    if (ui) { e.preventDefault(); mdSectionAction(ui.dataset.mdAct, ui.closest("[data-sec]")); }
  }, true);
}

function mdFillSlot(slot, dataUrl) {
  const avatar = slot.hasAttribute("data-avatar");
  slot.innerHTML = `<img src="${dataUrl}" alt="imagem" ${avatar ? 'style="border-radius:50%"' : ""}>`;
  toast("Imagem colocada na página 🖼️");
}

// escolhe imagem: enviar do aparelho OU da galeria (modal criado dinamicamente)
let mdPendingSlot = null;
function mdChooseImage(slot) {
  mdPendingSlot = slot;
  let modal = document.getElementById("mdImgChooser");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "mdImgChooser";
    modal.className = "modal-backdrop";
    modal.innerHTML = `<div class="modal" style="max-width:420px;text-align:center">
      <h3 style="margin:0 0 6px">Adicionar imagem</h3>
      <p style="color:var(--text-2);margin:0 0 16px">De onde vem a foto?</p>
      <div class="ai-launch" style="justify-content:center">
        <button class="ai-btn" id="mdImgFromFile">📁 Enviar do aparelho</button>
        <button class="ai-btn" id="mdImgFromGallery">🖼️ Da galeria</button>
      </div>
      <input type="file" id="mdImgFile" accept="image/*" hidden />
      <div class="form-actions" style="justify-content:center;margin-top:14px">
        <button class="btn btn-ghost btn-sm" id="mdImgCancel">Cancelar</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => { if (e.target === modal || e.target.id === "mdImgCancel") modal.hidden = true; });
    document.getElementById("mdImgFromFile").addEventListener("click", () => document.getElementById("mdImgFile").click());
    document.getElementById("mdImgFile").addEventListener("change", async (e) => {
      const f = e.target.files[0]; e.target.value = "";
      modal.hidden = true;
      if (!f || !mdPendingSlot) return;
      const url = await window.compressImageFile(f);
      mdFillSlot(mdPendingSlot, url);
    });
    document.getElementById("mdImgFromGallery").addEventListener("click", () => {
      modal.hidden = true;
      window.pickImage((id) => {
        const rec = imgById(id);
        if (rec && mdPendingSlot) mdFillSlot(mdPendingSlot, rec.dataUrl);
      });
    });
  }
  modal.hidden = false;
}

function mdSetButtonLink(a) {
  const cur = a.getAttribute("href") || "";
  const url = prompt("Link do botão (checkout, WhatsApp, outro site):\n\nDica: cole a URL do seu checkout (Kiwify, Hotmart, Cakto, Mercado Pago…).", cur.startsWith("http") ? cur : md.checkout || "https://");
  if (url === null) return;
  const clean = url.trim();
  if (clean) { a.href = clean; a.removeAttribute("onclick"); a.target = "_blank"; toast("Link do botão atualizado 🔗"); }
}

// ---------- toolbar por seção (remover / mover) ----------
function mdDecorate() {
  const doc = $("#mdFrame").contentDocument;
  if (!doc) return;
  doc.body.contentEditable = mdEditing ? "true" : "false";
  doc.body.classList.toggle("md-edit", mdEditing);
  // injeta CSS de edição uma vez
  if (!doc.getElementById("md-edit-css")) {
    const s = doc.createElement("style");
    s.id = "md-edit-css";
    s.textContent = `.md-edit [data-sec]{position:relative;outline:1px dashed transparent;transition:outline .15s}
      .md-edit [data-sec]:hover{outline:1px dashed rgba(124,58,237,.55)}
      .md-tb{position:absolute;top:6px;right:6px;display:none;gap:4px;z-index:9}
      .md-edit [data-sec]:hover>.md-tb{display:flex}
      .md-tb button{border:none;background:#12102b;color:#fff;width:30px;height:30px;border-radius:8px;font-size:14px;cursor:pointer;opacity:.9}
      .md-tb button:hover{opacity:1;background:#7c3aed}
      .md-grip{cursor:grab}.md-grip:active{cursor:grabbing}
      .md-edit [data-drag]{position:relative}
      .md-mini-grip{position:absolute;top:4px;left:4px;z-index:9;width:26px;height:26px;border-radius:7px;border:none;background:rgba(18,16,43,.85);color:#fff;font-size:13px;cursor:grab;display:none;align-items:center;justify-content:center}
      .md-edit [data-drag]:hover>.md-mini-grip{display:flex}
      .md-dragging{opacity:.45!important;outline:2px dashed #7c3aed!important}`;
    doc.head.appendChild(s);
  }
  // toolbars das SEÇÕES (mover/remover/arrastar)
  doc.querySelectorAll("[data-sec]").forEach((sec) => {
    if (sec.dataset.sec === "footer") return;
    sec.setAttribute("data-drag", "");
    let tb = sec.querySelector(":scope > .md-tb");
    if (mdEditing && !tb) {
      tb = doc.createElement("div");
      tb.className = "md-tb";
      tb.setAttribute("contenteditable", "false");
      tb.setAttribute("data-md-ui", "1");
      tb.innerHTML = `<button class="md-grip" data-md-grip title="Arrastar pra reposicionar">⠿</button>
        <button data-md-act="up" title="Mover pra cima">↑</button>
        <button data-md-act="down" title="Mover pra baixo">↓</button>
        <button data-md-act="del" title="Remover seção">✕</button>`;
      sec.appendChild(tb);
    } else if (!mdEditing && tb) { tb.remove(); sec.removeAttribute("data-drag"); }
  });
  // itens internos arrastáveis: cards de grade e fotos do carrossel
  doc.querySelectorAll(".grid3 > .card, .carousel > .img-slot").forEach((it) => {
    if (mdEditing) {
      it.setAttribute("data-drag", "");
      if (!it.querySelector(":scope > .md-mini-grip")) {
        const g = doc.createElement("button");
        g.className = "md-mini-grip"; g.type = "button";
        g.setAttribute("contenteditable", "false");
        g.setAttribute("data-md-ui", "1");
        g.setAttribute("data-md-grip", "");
        g.title = "Arrastar pra reposicionar";
        g.textContent = "⠿";
        it.insertBefore(g, it.firstChild);
      }
    } else {
      it.removeAttribute("data-drag");
      it.querySelector(":scope > .md-mini-grip")?.remove();
    }
  });
  mdEnableDrag(doc);
}

// arrastar (segurar) qualquer bloco/objeto pra reposicionar dentro do mesmo grupo
function mdEnableDrag(doc) {
  if (doc.__mdDrag) return;
  doc.__mdDrag = true;
  let item = null, parent = null;

  doc.addEventListener("pointerdown", (e) => {
    if (!mdEditing) return;
    const grip = e.target.closest("[data-md-grip]");
    if (!grip) return;
    item = grip.closest("[data-drag]");
    if (!item) return;
    parent = item.parentNode;
    e.preventDefault(); e.stopPropagation();
    item.classList.add("md-dragging");
    try { grip.setPointerCapture(e.pointerId); } catch (_) {}
  });

  doc.addEventListener("pointermove", (e) => {
    if (!item) return;
    e.preventDefault();
    const sibs = [...parent.children].filter((c) => c !== item && c.hasAttribute && c.hasAttribute("data-drag"));
    let closest = null, dist = Infinity, before = false;
    for (const s of sibs) {
      const r = s.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const d = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (d < dist) { dist = d; closest = s; before = e.clientY < cy - 2 || (Math.abs(e.clientY - cy) < 6 && e.clientX < cx); }
    }
    if (closest) parent.insertBefore(item, before ? closest : closest.nextSibling);
  });

  const end = () => {
    if (!item) return;
    item.classList.remove("md-dragging");
    item = null; parent = null;
    toast("Posição atualizada ✅");
  };
  doc.addEventListener("pointerup", end);
  doc.addEventListener("pointercancel", end);
}

function mdSectionAction(act, sec) {
  if (!sec) return;
  if (act === "del") {
    if (sec.querySelector(":scope > .wrap")?.textContent.trim() && !confirm("Remover esta seção da página?")) return;
    sec.remove();
    toast("Seção removida 🗑️");
  } else if (act === "up" && sec.previousElementSibling) {
    sec.parentNode.insertBefore(sec, sec.previousElementSibling);
  } else if (act === "down" && sec.nextElementSibling && sec.nextElementSibling.dataset.sec !== "footer") {
    sec.parentNode.insertBefore(sec.nextElementSibling, sec);
  }
}

// ---------- adicionar seções ----------
const MD_ADDERS = {
  carousel: () => secCarousel(5),
  banner: secBanner,
  image: secImage,
  heading: secHeading,
  text: secText,
  testimonials: () => secTestimonials(),
  cta: () => secCta(),
};

$$("[data-md-add]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const doc = $("#mdFrame").contentDocument;
    if (!doc) return toast("Gere a página primeiro 🚀");
    const html = MD_ADDERS[btn.dataset.mdAdd]?.();
    if (!html) return;
    const footer = doc.querySelector('[data-sec="footer"]');
    const tmp = doc.createElement("div");
    tmp.innerHTML = html.trim();
    const node = tmp.firstElementChild;
    if (footer) footer.parentNode.insertBefore(node, footer);
    else doc.body.appendChild(node);
    mdDecorate();
    if (md.checkout) node.querySelectorAll("a[data-buy]").forEach((a) => { a.href = md.checkout; a.removeAttribute("onclick"); a.target = "_blank"; });
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    toast("Seção adicionada ✅ Role até ela e edite");
  });
});

// ---------- preview: dispositivo ----------
$$("[data-md-dev]").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$("[data-md-dev]").forEach((b) => b.classList.toggle("active", b === btn));
    $("#mdFrameWrap").dataset.dev = btn.dataset.mdDev;
  });
});

$("#btnMdEdit").addEventListener("click", () => {
  mdEditing = !mdEditing;
  $("#btnMdEdit").textContent = `✏️ Editar: ${mdEditing ? "ON" : "OFF"}`;
  mdDecorate();
  toast(mdEditing ? "Edição ligada — clique em textos, imagens e botões ✏️" : "Edição desligada 🔒");
});

// ---------- serializar (limpa a UI de edição) ----------
function mdSerialize() {
  const doc = $("#mdFrame").contentDocument;
  if (!doc) return null;
  const clone = doc.documentElement.cloneNode(true);
  clone.querySelectorAll("[data-md-ui], #md-edit-css").forEach((n) => n.remove());
  clone.querySelectorAll("[data-drag]").forEach((n) => n.removeAttribute("data-drag"));
  clone.querySelectorAll(".md-dragging").forEach((n) => n.classList.remove("md-dragging"));
  const body = clone.querySelector("body");
  if (body) { body.removeAttribute("contenteditable"); body.classList.remove("md-edit"); }
  return "<!DOCTYPE html>\n" + clone.outerHTML;
}

$("#btnMdDownload").addEventListener("click", () => {
  const html = mdSerialize();
  if (!html) return toast("Gere a página primeiro 🚀");
  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${slug(md.offer?.name || "pagina")}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Página baixada ⬇️ (renomeie pra index.html pro Netlify Drop)");
});

// ---------- publicação no Netlify ----------
const NTL_KEY = "pulsar_netlify_token";

function loadJSZip() {
  if (window.JSZip) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
    s.onload = res;
    s.onerror = () => rej(new Error("Falha ao carregar o compactador"));
    document.head.appendChild(s);
  });
}

$("#btnMdPublish").addEventListener("click", async () => {
  const html = mdSerialize();
  if (!html) return toast("Gere a página primeiro 🚀");
  let token = localStorage.getItem(NTL_KEY);
  if (!token) {
    token = prompt(
      "Pra ganhar o domínio grátis automático, cole seu token do Netlify (1x só):\n\n1. Crie conta grátis em netlify.com\n2. User settings → Applications → New access token\n3. Cole aqui:"
    );
    if (!token) {
      $("#mdPublishOut").innerHTML = `<div class="om-desc">Sem token, use o caminho manual (também grátis): <strong>1)</strong> Baixar HTML · <strong>2)</strong> renomear pra <code>index.html</code> · <strong>3)</strong> arrastar em <a class="link-inline" href="https://app.netlify.com/drop" target="_blank" rel="noopener">app.netlify.com/drop ↗</a> — o domínio sai na hora.</div>`;
      return;
    }
    localStorage.setItem(NTL_KEY, token.trim());
    token = token.trim();
  }
  const btn = $("#btnMdPublish");
  btn.disabled = true;
  btn.textContent = "🌐 Publicando…";
  try {
    await loadJSZip();
    const siteName = slug(md.offer.name) + "-" + Math.floor(Math.random() * 900 + 100);
    let site;
    const mk = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ name: siteName }),
    });
    if (mk.ok) site = await mk.json();
    else {
      const mk2 = await fetch("https://api.netlify.com/api/v1/sites", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: "{}",
      });
      if (!mk2.ok) throw new Error("Token inválido ou sem permissão (HTTP " + mk2.status + ")");
      site = await mk2.json();
    }
    const zip = new JSZip();
    zip.file("index.html", html);
    const blob = await zip.generateAsync({ type: "blob" });
    const dep = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/zip" },
      body: blob,
    });
    if (!dep.ok) throw new Error("Falha no deploy (HTTP " + dep.status + ")");
    const url = site.ssl_url || site.url || `https://${site.name}.netlify.app`;
    $("#mdPublishOut").innerHTML = `<div class="bw-ok">🌐 <strong>Página no ar!</strong> Domínio grátis criado:
      <a class="link-inline" href="${url}" target="_blank" rel="noopener">${url} ↗</a>
      <br><span class="hint">Pode levar ~1 minuto pra propagar. Publicar de novo cria uma nova versão.</span></div>`;
    toast("Página publicada no Netlify 🌐");
    window.open(url, "_blank", "noopener");
  } catch (err) {
    localStorage.removeItem(NTL_KEY);
    $("#mdPublishOut").innerHTML = `<div class="bw-flag risk-med" style="border-left-color:var(--bad)">
      <span class="bw-term">Não consegui publicar automaticamente</span>
      <p>${escHtml(err.message || String(err))} — o token foi descartado; tente com um novo, ou use o caminho manual:
      <strong>Baixar HTML</strong> (renomeie pra <code>index.html</code>) e arraste em
      <a class="link-inline" href="https://app.netlify.com/drop" target="_blank" rel="noopener">app.netlify.com/drop ↗</a>.</p>
    </div>`;
  }
  btn.disabled = false;
  btn.textContent = "🌐 Publicar no Netlify";
});
