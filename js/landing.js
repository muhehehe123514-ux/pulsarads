/* PulsarAds — landing interactions */

// ---------- Nav ----------
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 10);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const burger = document.getElementById("navBurger");
const links = document.getElementById("navLinks");
burger.addEventListener("click", () => links.classList.toggle("open"));
links.addEventListener("click", (e) => {
  if (e.target.tagName === "A") links.classList.remove("open");
});

// ---------- Reveal on scroll ----------
const io = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add("visible");
        io.unobserve(en.target);
      }
    }
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal:not(.visible)").forEach((el) => io.observe(el));

// ---------- Animated counters ----------
const counterIO = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      counterIO.unobserve(el);
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || "";
      if (target === 0) { el.textContent = "0" + suffix; continue; }
      const dur = 1200;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  },
  { threshold: 0.6 }
);
document.querySelectorAll("[data-count]").forEach((el) => counterIO.observe(el));

// ---------- Tools grid ----------
const TOOLS = [
  { id: "painel",      name: "Painel de Campanhas",     desc: "Acompanhe investimento, faturamento, ROAS, CPC e CTR com gráficos — dados salvos só no seu navegador.", icon: "M3 20V10m6 10V4m6 16v-7m6 7V8" },
  { id: "headlines",   name: "Gerador de Headlines",    desc: "10 títulos persuasivos por clique, montados com frameworks clássicos de copywriting.", icon: "M4 6h16M4 12h10M4 18h7" },
  { id: "copy",        name: "Reescritor de Copy",      desc: "Gere variações da sua copy trocando conectores e sinônimos, mantendo a estrutura persuasiva.", icon: "M16 3H8a2 2 0 00-2 2v14l6-3 6 3V5a2 2 0 00-2-2z" },
  { id: "frameworks",  name: "Frameworks de Copy",      desc: "Preencha 4 campos e receba copies completas em AIDA, PAS e BAB, prontas pra testar.", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { id: "utm",         name: "Gerador de UTMs",         desc: "Monte links rastreáveis com utm_source, medium, campaign e content — com histórico local.", icon: "M10 14a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11 6M14 10a5 5 0 00-7.07 0L4.1 12.83a5 5 0 007.07 7.07L13 18" },
  { id: "escala",      name: "Simulador de Escala",     desc: "Projete cliques, vendas, receita e ROAS ao dobrar, triplicar ou 10x o orçamento.", icon: "M3 17l6-6 4 4 8-8M21 7v6h-6" },
  { id: "bloqueadas",  name: "Palavras Sensíveis",      desc: "Verifique sua copy contra termos que costumam reprovar anúncios e receba sugestões seguras.", icon: "M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" },
  { id: "metadados",   name: "Limpador de Metadados",   desc: "Remova dados EXIF das suas imagens antes de publicar e proteja sua privacidade.", icon: "M3 3l18 18M9 5h8a2 2 0 012 2v8M5 9v10a2 2 0 002 2h10" },
  { id: "audio",       name: "Gerador de Áudio",        desc: "Transforme copies em narração com as vozes nativas do navegador. Velocidade e tom ajustáveis.", icon: "M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 010 7M19 5a9 9 0 010 14" },
  { id: "transcritor", name: "Transcritor por Voz",     desc: "Dite roteiros e ideias e veja o texto aparecer em tempo real, em português.", icon: "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4" },
  { id: "criativo",    name: "Estúdio de Criativos",    desc: "Crie banners 1080×1080 e stories com templates de gradiente, headline e CTA. Baixe em PNG.", icon: "M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M4 4h16v16H4zM14 8h.01" },
  { id: "estilizado",  name: "Texto Estilizado",        desc: "Converta texto em 𝗻𝗲𝗴𝗿𝗶𝘁𝗼, 𝘪𝘵𝘢́𝘭𝘪𝘤𝘰 e outros estilos Unicode pra bios e posts.", icon: "M4 7V5h16v2M9 20h6M12 5v15" },
  { id: "radar",       name: "Radar de Concorrentes",   desc: "Pesquise anúncios ativos nas bibliotecas oficiais do Meta, Google e TikTok com um clique.", icon: "M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" },
  { id: "contador",    name: "Contador de Caracteres",  desc: "Valide títulos e descrições contra os limites do Meta Ads, Google Ads e TikTok Ads.", icon: "M4 6h16M4 10h16M4 14h10M4 18h6" },
];

const grid = document.getElementById("toolsGrid");
if (grid) {
  grid.innerHTML = TOOLS.map(
    (t, i) => `
    <a class="tool-card reveal${i % 4 === 1 ? " reveal-d1" : i % 4 === 2 ? " reveal-d2" : i % 4 === 3 ? " reveal-d3" : ""}" href="app.html#${t.id}">
      <div class="tool-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${t.icon}"/></svg>
      </div>
      <h4>${t.name}</h4>
      <p>${t.desc}</p>
      <span class="tc-go">Usar agora
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </span>
    </a>`
  ).join("");
  grid.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // spotlight segue o mouse nos cards
  grid.addEventListener("pointermove", (e) => {
    const card = e.target.closest(".tool-card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
}
