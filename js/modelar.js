/* ============================================================
   PulsarAds — ✨ Modelar Oferta
   Descrição da oferta-base → novos ângulos pra novos públicos →
   promessa → headline/sub → página de vendas (10 seções) com
   preview editável, arrastar-imagem e publicação no Netlify.
   ============================================================ */

"use strict";

const md = { idx: null, offer: null, ideas: [], idea: null, proms: [], prom: null, headline: "", sub: "", brand: "Sua Marca" };

// ---------- passo 1: escolher a oferta-base ----------
function mdRefreshOffers() {
  const offers = loadOffers();
  $("#mdOffer").innerHTML = offers.length
    ? offers.map((o, i) => `<option value="${i}">${escHtml(o.name)}</option>`).join("")
    : `<option value="">— salve ofertas na 📚 Biblioteca primeiro —</option>`;
  mdShowBase();
}

function mdShowBase() {
  const o = loadOffers()[+$("#mdOffer").value];
  const box = $("#mdBaseDesc");
  if (!o) { box.hidden = true; return; }
  box.hidden = false;
  box.textContent = o.desc || o.notes || `Oferta "${o.name}" (sem descrição salva — os ângulos serão gerados pelo nome).`;
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

// ---------- passo 2: novos ângulos pra novos públicos ----------
const MD_PUBLICS = ["mães ocupadas", "iniciantes totais", "pessoas 50+", "homens práticos", "jovens (18–25)", "quem busca renda extra", "público cristão", "quem tem só 15 min por dia", "professores e educadores", "quem já tentou de tudo"];
const MD_ANGLES = [
  (t, p) => `Versão express: "${cap(t)}" condensado pra resultado em 7 dias — feito pra ${p}.`,
  (t, p) => `Desafio de 21 dias: transformar "${t}" em um desafio guiado com check-list diário pra ${p}.`,
  (t, p) => `Kit pra imprimir: entregar "${t}" em formato físico-digital (PDF pra imprimir) — ${p} amam material palpável.`,
  (t, p) => `Anti-erro: "Os 10 erros que ${p} cometem em ${t}" — ângulo de medo/curiosidade, converte frio.`,
  (t, p) => `Do absoluto zero: "${cap(t)}" explicado sem nenhum termo técnico, passo a passo mastigado pra ${p}.`,
  (t, p) => `Combo dupla: versão pra fazer em dupla/família — dobra o valor percebido pra ${p}.`,
  (t, p) => `Método com nome próprio: batizar o sistema (ex.: "Método Pulso") e vender o MÉTODO, não o tema — autoridade instantânea com ${p}.`,
  (t, p) => `Resultado sem o "chato": "${cap(t)}" sem a parte que ${p} mais odeiam (prometa remover a maior fricção).`,
  (t, p) => `Baseado em rotina: encaixar "${t}" na rotina real de ${p} (manhã corrida, intervalo do trabalho, noite).`,
  (t, p) => `Upgrade de status: posicionar "${t}" como algo que faz ${p} serem admirados por quem está perto.`,
];

$("#btnMdIdeas").addEventListener("click", () => {
  const offers = loadOffers();
  md.idx = +$("#mdOffer").value;
  md.offer = offers[md.idx];
  if (!md.offer) return toast("Salve uma oferta na 📚 Biblioteca primeiro");
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
  // heurística do site: prioriza ângulos de fricção/erro (convertem melhor no frio)
  let best = md.ideas.findIndex((t) => /erro|sem o|express|21 dias/i.test(t));
  if (best < 0) best = 0;
  renderPickList("#mdIdeas", md.ideas, "md-idea", best);
  $$("#mdIdeas .pick-item")[best].classList.add("picked");
  md.idea = md.ideas[best];
  toast("O site escolheu o ângulo com maior potencial ✨");
  mdGenProms();
});

// ---------- passo 3: promessas ----------
function mdGenProms() {
  const t = md.offer.name.toLowerCase();
  const price = md.offer.price ? "R$ " + (+md.offer.price).toFixed(2).replace(".", ",") : "R$ 27,00";
  md.proms = [
    `Domine ${t} em até 7 dias seguindo um passo a passo simples — mesmo começando do absoluto zero.`,
    `Resultados visíveis com só 15 minutos por dia, sem precisar de experiência nem equipamento caro.`,
    `O caminho mais curto pra ${t}: sem enrolação, sem teoria infinita, direto pro que funciona.`,
    `Pare de tentar sozinho: um método organizado que elimina os erros que travam 9 em cada 10 iniciantes.`,
    `Tudo pronto pra usar hoje: material completo, acesso imediato e suporte às suas dúvidas — por menos que uma pizza (${price}).`,
    `A transformação completa com garantia: ou você vê resultado, ou recebe 100% do valor de volta em 7 dias.`,
  ];
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
  let best = md.proms.findIndex((t) => /15 minutos|7 dias/i.test(t));
  if (best < 0) best = 0;
  renderPickList("#mdProms", md.proms, "md-prom", best);
  $$("#mdProms .pick-item")[best].classList.add("picked");
  md.prom = md.proms[best];
  toast("O site escolheu a promessa mais forte ✨");
  mdGenHeads();
});

// ---------- passo 4: headline & subheadline ----------
function mdGenHeads() {
  const t = md.offer.name;
  const H = [
    `${cap(t)}: ${md.prom.split(" — ")[0].split(":").pop().trim()}`,
    `Descubra como ${t.toLowerCase()} pode mudar sua rotina em dias — não em meses`,
    `O método definitivo de ${t.toLowerCase()} pra quem quer resultado sem complicação`,
  ];
  const S = [
    `${md.prom} Acesso imediato após a compra.`,
    `Mais de mil pessoas já usam este material. Chegou a sua vez — com garantia incondicional de 7 dias.`,
    `Material completo, direto ao ponto, feito pra você aplicar hoje mesmo.`,
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

// ---------- passo 5: página de vendas ----------
const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "minha-oferta";

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
  const dep = [
    ["Ana P.", `Eu não sabia nada de ${nicheName.toLowerCase()} e em uma semana já estava aplicando tudo. Material direto ao ponto!`],
    ["Carlos M.", "Achei que seria só mais um PDF, mas é completíssimo. Os bônus sozinhos já valem o preço."],
    ["Juliana R.", "Comprei, apliquei e voltei pra comprar o combo. O suporte no grupo é um diferencial enorme."],
  ];
  const img = o.img && typeof imgById === "function" ? imgById(o.img) : null;
  const heroImg = img ? `<img src="${img.dataUrl}" alt="${escHtml(name)}">` : `<span>📷 Arraste a foto do produto aqui</span>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(name)} — ${escHtml(md.headline)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1c28;line-height:1.6;background:#fff}
.wrap{max-width:960px;margin:0 auto;padding:0 20px}section{padding:56px 0}h2{font-size:clamp(24px,4vw,34px);text-align:center;margin-bottom:28px}
.hero{background:linear-gradient(160deg,#12102b,#3b1d7a 60%,#0ea5e9);color:#fff;text-align:center;padding:72px 0}
.hero h1{font-size:clamp(30px,5.5vw,52px);line-height:1.15;margin-bottom:18px}.hero p{font-size:clamp(16px,2.2vw,20px);opacity:.92;max-width:640px;margin:0 auto 30px}
.img-slot{min-height:220px;max-width:420px;margin:26px auto;border:3px dashed rgba(255,255,255,.4);border-radius:16px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.75);font-size:14px;overflow:hidden;background:rgba(255,255,255,.06)}
.img-slot img{width:100%;height:100%;object-fit:cover;display:block}
.btn{display:inline-block;background:#22c55e;color:#fff;font-weight:800;font-size:18px;padding:18px 42px;border-radius:999px;text-decoration:none;box-shadow:0 12px 34px rgba(34,197,94,.4);transition:transform .2s}.btn:hover{transform:translateY(-2px)}
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}
.card{background:#f6f6fb;border:1px solid #e6e6f2;border-radius:16px;padding:26px;text-align:center}
.card h3{margin-bottom:10px;font-size:18px}
.alt{background:#f6f6fb}
.offer{background:linear-gradient(160deg,#12102b,#26124d);color:#fff;text-align:center}
.offer .price{font-size:56px;font-weight:800;margin:10px 0}.offer .old{text-decoration:line-through;opacity:.6;font-size:20px}
#timer{font-size:34px;font-weight:800;letter-spacing:2px;background:rgba(255,255,255,.1);display:inline-block;padding:10px 26px;border-radius:12px;margin:14px 0}
.carousel{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:10px}
.carousel .img-slot{min-width:240px;height:240px;margin:0;scroll-snap-align:center;border-color:#c9c9dd;color:#8a8aa0}
.dep{font-style:italic}.dep b{display:block;margin-top:12px;font-style:normal;color:#3b1d7a}
.gar{display:flex;gap:22px;align-items:center;max-width:720px;margin:0 auto;background:#effaf1;border:2px solid #22c55e;border-radius:18px;padding:26px}
.gar .g7{font-size:52px}
details{max-width:720px;margin:0 auto 10px;background:#f6f6fb;border:1px solid #e6e6f2;border-radius:12px;padding:16px 20px}summary{font-weight:700;cursor:pointer}details p{margin-top:10px;color:#4a4a5e}
footer{background:#12102b;color:rgba(255,255,255,.7);text-align:center;padding:26px;font-size:14px}
.stars{color:#f5b301;letter-spacing:2px}
</style></head>
<body>
<!-- 1ª seção: hero -->
<section class="hero"><div class="wrap">
<h1>${escHtml(md.headline)}</h1>
<p>${escHtml(md.sub)}</p>
<div class="img-slot" data-slot>${heroImg}</div>
<a class="btn" href="#oferta">QUERO GARANTIR O MEU 🔥</a>
</div></section>
<!-- 2ª seção: o que vai receber -->
<section><div class="wrap">
<h2>O que você vai receber 📦</h2>
<div class="grid3">
<div class="card"><h3>Material completo</h3><p>${escHtml(name)} inteiro, organizado em módulos simples pra você seguir sem se perder — do primeiro passo ao resultado.</p></div>
<div class="card"><h3>Acesso imediato</h3><p>Pagou, chegou: o material cai no seu e-mail em minutos e é seu pra sempre, pra acessar de qualquer aparelho.</p></div>
<div class="card"><h3>Atualizações incluídas</h3><p>Toda melhoria futura do material chega pra você automaticamente, sem pagar nada a mais.</p></div>
</div></div></section>
<!-- 3ª seção: por que escolher -->
<section class="alt"><div class="wrap">
<h2>Por que escolher nosso material? 💎</h2>
<div class="grid3">
<div class="card"><h3>⚡ Direto ao ponto</h3><p>Nada de enrolação: só o que funciona, explicado em linguagem simples pra aplicar no mesmo dia.</p></div>
<div class="card"><h3>🧭 Passo a passo real</h3><p>Você nunca fica perdido: cada etapa diz exatamente o que fazer, na ordem certa.</p></div>
<div class="card"><h3>🛟 Suporte de verdade</h3><p>Ficou com dúvida? Nosso canal de suporte responde você — ninguém fica pra trás.</p></div>
</div></div></section>
<!-- 4ª seção: bônus -->
<section><div class="wrap">
<h2>E ainda tem bônus 🎁</h2>
<div class="grid3">
${bonus.map(([t, d]) => `<div class="card"><h3>${escHtml(t)}</h3><p>${escHtml(d)}</p></div>`).join("\n")}
</div></div></section>
<!-- 5ª seção: oferta com temporizador -->
<section class="offer" id="oferta"><div class="wrap">
<h2>Oferta por tempo limitado ⏰</h2>
<p>Essa condição especial expira em:</p>
<div id="timer">15:00</div>
<p class="old">De R$ ${(parseFloat(price.replace(",", ".")) * 3).toFixed(2).replace(".", ",")}</p>
<p class="price">R$ ${price}</p>
<p style="opacity:.85;margin-bottom:24px">Pagamento único · Acesso imediato · Garantia de 7 dias</p>
<a class="btn" href="#" onclick="alert('Troque este link pelo seu checkout! Edite o botão com a edição ligada.');return false">COMPRAR AGORA POR R$ ${price} →</a>
</div></section>
<!-- 6ª seção: exemplos (carrossel 5 fotos) -->
<section><div class="wrap">
<h2>Veja exemplos do que você vai receber 👀</h2>
<div class="carousel">
${'<div class="img-slot" data-slot><span>📷 Arraste uma foto</span></div>'.repeat(5)}
</div></div></section>
<!-- 7ª seção: depoimentos -->
<section class="alt"><div class="wrap">
<h2>Quem comprou, aprova ⭐</h2>
<!-- IMPORTANTE: troque pelos depoimentos REAIS dos seus clientes -->
<div class="grid3">
${dep.map(([n, t]) => `<div class="card dep"><span class="stars">★★★★★</span><p>"${escHtml(t)}"</p><b>${escHtml(n)}</b></div>`).join("\n")}
</div></div></section>
<!-- 8ª seção: garantia -->
<section><div class="wrap">
<div class="gar"><div class="g7">🛡️</div><div>
<h3 style="margin-bottom:8px">Garantia incondicional de 7 dias</h3>
<p>Se por qualquer motivo você achar que o material não é pra você, é só mandar um e-mail em até 7 dias e devolvemos 100% do seu dinheiro. Sem perguntas, sem burocracia. O risco é todo nosso.</p>
</div></div></div></section>
<!-- 9ª seção: FAQ -->
<section class="alt"><div class="wrap">
<h2>Perguntas frequentes ❓</h2>
${faq.map(([q, a]) => `<details><summary>${escHtml(q)}</summary><p>${escHtml(a)}</p></details>`).join("\n")}
</div></section>
<!-- 10ª seção: rodapé -->
<footer>© 2026 ${escHtml(md.brand)}. Todos os direitos reservados.</footer>
<script>
(function(){var s=15*60,el=document.getElementById('timer');setInterval(function(){if(s<=0)return;s--;var m=String(Math.floor(s/60)).padStart(2,'0'),x=String(s%60).padStart(2,'0');el.textContent=m+':'+x;},1000);})();
</script>
</body></html>`;
}

$("#btnMdPage").addEventListener("click", () => {
  if (!md.offer) return toast("Comece pelo passo 1 ✨");
  if (!md.prom) { md.prom = md.proms[0] || ""; }
  if (!md.headline) mdGenHeads();
  const html = buildSalesPage();
  const frame = $("#mdFrame");
  frame.srcdoc = html;
  frame.addEventListener("load", mdSetupFrame, { once: true });
  $("#mdPageCard").hidden = false;
  $("#mdPublishOut").innerHTML = "";
  $("#mdPageCard").scrollIntoView({ behavior: "smooth", block: "start" });
  toast("Página de vendas gerada 🚀 Edite à vontade!");
});

// edição + arrastar imagens dentro do preview
let mdEditing = true;
function mdSetupFrame() {
  const doc = $("#mdFrame").contentDocument;
  if (!doc) return;
  doc.body.contentEditable = mdEditing ? "true" : "false";
  doc.addEventListener("dragover", (e) => e.preventDefault());
  doc.addEventListener("drop", async (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f || !/^image\//.test(f.type)) return;
    const slot = e.target.closest(".img-slot") || doc.querySelector(".img-slot");
    const rec = await addImageToGallery(f);
    if (!rec || !slot) return;
    slot.innerHTML = `<img src="${rec.dataUrl}" alt="${escHtml(rec.desc)}">`;
    toast("Imagem colocada na página 🖼️");
  });
}

$("#btnMdEdit").addEventListener("click", () => {
  mdEditing = !mdEditing;
  $("#btnMdEdit").textContent = `✏️ Editar: ${mdEditing ? "ON" : "OFF"}`;
  const doc = $("#mdFrame").contentDocument;
  if (doc) doc.body.contentEditable = mdEditing ? "true" : "false";
  toast(mdEditing ? "Edição ligada — clique em qualquer texto ✏️" : "Edição desligada 🔒");
});

function mdSerialize() {
  const doc = $("#mdFrame").contentDocument;
  if (!doc) return null;
  const clone = doc.documentElement.cloneNode(true);
  clone.querySelector("body")?.removeAttribute("contenteditable");
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
  toast("Página baixada ⬇️ (index.html pronto pro Netlify Drop)");
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
    // 1) cria o site com o nome da oferta
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
    // 2) sobe o zip com a página
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
