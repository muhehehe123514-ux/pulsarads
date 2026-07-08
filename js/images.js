/* ============================================================
   PulsarAds — Galeria de imagens compartilhada
   Imagens comprimidas em dataURL no localStorage; toda imagem
   nova exige uma descrição (1ª vez) — é o índice da "luneta".
   Usada pelo Estúdio, Biblioteca e Página de Vendas.
   ============================================================ */

"use strict";

const IMG_KEY = "pulsar_images";
const loadImgs = () => JSON.parse(localStorage.getItem(IMG_KEY) || "[]");
const saveImgs = (a) => localStorage.setItem(IMG_KEY, JSON.stringify(a));
const imgById = (id) => loadImgs().find((i) => i.id === id) || null;

// comprime pra caber no localStorage (máx ~900px, JPEG 0.82)
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 900;
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// exposto pra páginas de vendas: comprime e devolve o dataURL, sem passar pela galeria
window.compressImageFile = compressImage;

// fila de descrições: cada imagem NOVA passa pelo modal (obrigatório 1ª vez)
let descQueue = [];
let descResolve = null;

function askDescription(dataUrl) {
  return new Promise((resolve) => {
    descQueue.push({ dataUrl, resolve });
    if (descQueue.length === 1) showNextDesc();
  });
}

function showNextDesc() {
  const item = descQueue[0];
  if (!item) return;
  $("#imgDescPreview").src = item.dataUrl;
  $("#imgDescInput").value = "";
  $("#imgDescModal").hidden = false;
  setTimeout(() => $("#imgDescInput").focus(), 50);
  descResolve = item.resolve;
}

function finishDesc(desc) {
  $("#imgDescModal").hidden = true;
  const item = descQueue.shift();
  if (item) item.resolve(desc);
  if (descQueue.length) showNextDesc();
}

$("#btnImgDescSave").addEventListener("click", () => {
  const d = $("#imgDescInput").value.trim();
  if (d.length < 3) return toast("Descreva a imagem primeiro — é obrigatório na 1ª vez 🔭");
  finishDesc(d);
});
$("#imgDescInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#btnImgDescSave").click();
});
$("#btnImgDescCancel").addEventListener("click", () => finishDesc(null));

// adiciona um File à galeria (retorna o registro ou null se cancelado)
async function addImageToGallery(file) {
  if (!/^image\//.test(file.type)) { toast("Só imagens 📷"); return null; }
  let dataUrl;
  try { dataUrl = await compressImage(file); }
  catch { toast("Não consegui ler essa imagem 😕"); return null; }
  const desc = await askDescription(dataUrl);
  if (!desc) return null;
  const rec = { id: "img_" + Date.now() + "_" + Math.floor(Math.random() * 1e4), desc, dataUrl, created: new Date().toISOString().slice(0, 10) };
  const imgs = loadImgs();
  imgs.unshift(rec);
  try { saveImgs(imgs); }
  catch {
    toast("Galeria cheia! Exclua imagens antigas pra liberar espaço 🗄️");
    return null;
  }
  renderGalleryAll();
  toast(`Imagem salva na galeria: "${desc}" 🖼️`);
  return rec;
}
window.addImageToGallery = addImageToGallery;

// ---------- renderização (painel do Estúdio + selects) ----------
function galItemHtml(i, selectable) {
  return `<div class="gal-item" data-gal-id="${i.id}" title="${escHtml(i.desc)}">
    <img src="${i.dataUrl}" alt="${escHtml(i.desc)}" loading="lazy" />
    <div class="gd">${escHtml(i.desc)}</div>
    ${selectable ? "" : `<button class="gx" data-gal-del="${i.id}" title="Excluir">✕</button>`}
  </div>`;
}

function renderGalleryAll() {
  // grid do Estúdio
  const q = ($("#galSearch")?.value || "").trim().toLowerCase();
  const imgs = loadImgs().filter((i) => !q || i.desc.toLowerCase().includes(q));
  const grid = $("#galGrid");
  if (grid) {
    grid.innerHTML = imgs.length
      ? imgs.map((i) => galItemHtml(i, false)).join("")
      : `<p class="hint" style="grid-column:1/-1">Nenhuma imagem ${q ? "encontrada com essa busca" : "ainda — arraste a primeira!"} </p>`;
  }
  // select da Biblioteca
  const sel = $("#lfImg");
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = `<option value="">Sem imagem</option>` + loadImgs().map((i) => `<option value="${i.id}">${escHtml(i.desc)}</option>`).join("");
    if (cur && imgById(cur)) sel.value = cur;
  }
}
window.renderGalleryAll = renderGalleryAll;

$("#galSearch")?.addEventListener("input", renderGalleryAll);

$("#galGrid")?.addEventListener("click", (e) => {
  const del = e.target.closest("[data-gal-del]");
  if (del) {
    if (!confirm("Excluir essa imagem da galeria?")) return;
    saveImgs(loadImgs().filter((i) => i.id !== del.dataset.galDel));
    renderGalleryAll();
    return;
  }
  const item = e.target.closest("[data-gal-id]");
  if (item && window.setStudioImage) {
    window.setStudioImage(item.dataset.galId);
  }
});

// dropzone do Estúdio
const galDrop = $("#galDrop");
if (galDrop) {
  galDrop.addEventListener("dragover", (e) => { e.preventDefault(); galDrop.classList.add("drag"); });
  galDrop.addEventListener("dragleave", () => galDrop.classList.remove("drag"));
  galDrop.addEventListener("drop", async (e) => {
    e.preventDefault();
    galDrop.classList.remove("drag");
    for (const f of e.dataTransfer.files) await addImageToGallery(f);
  });
  $("#galFile").addEventListener("change", async (e) => {
    for (const f of e.target.files) await addImageToGallery(f);
    e.target.value = "";
  });
}

// ---------- seletor genérico (modal 🖼️ Escolher da galeria) ----------
let galPickCb = null;
window.pickImage = (cb) => {
  galPickCb = cb;
  $("#galPickSearch").value = "";
  renderGalleryPick();
  $("#galleryModal").hidden = false;
};

function renderGalleryPick() {
  const q = $("#galPickSearch").value.trim().toLowerCase();
  const imgs = loadImgs().filter((i) => !q || i.desc.toLowerCase().includes(q));
  $("#galPickGrid").innerHTML = imgs.length
    ? imgs.map((i) => galItemHtml(i, true)).join("")
    : `<p class="hint" style="grid-column:1/-1">Galeria vazia — adicione imagens no 🎨 Estúdio de Criativos.</p>`;
}
$("#galPickSearch").addEventListener("input", renderGalleryPick);
$("#galPickGrid").addEventListener("click", (e) => {
  const item = e.target.closest("[data-gal-id]");
  if (!item) return;
  $("#galleryModal").hidden = true;
  if (galPickCb) galPickCb(item.dataset.galId);
});
$("#galleryModalClose").addEventListener("click", () => ($("#galleryModal").hidden = true));
$("#galleryModal").addEventListener("click", (e) => {
  if (e.target === $("#galleryModal")) $("#galleryModal").hidden = true;
});

renderGalleryAll();

// ---------- Estúdio: imagem do produto no criativo ----------
let studioImg = null; // { id, el: Image }
window.setStudioImage = (id) => {
  const rec = imgById(id);
  if (!rec) return;
  const el = new Image();
  el.onload = () => {
    studioImg = { id, el };
    $("#btnCrClearImg").hidden = false;
    $("#crImgHint").textContent = `Usando: "${rec.desc}"`;
    if (window.renderCreativeStudio) window.renderCreativeStudio();
    toast("Imagem aplicada no criativo 🎨");
  };
  el.src = rec.dataUrl;
};
window.getStudioImage = () => studioImg?.el || null;

// usa uma imagem por URL (ex.: criativo gerado por IA) como imagem do produto no canvas
window.setStudioImageUrl = (url) => {
  const el = new Image();
  el.crossOrigin = "anonymous"; // mantém o canvas "limpo" pra exportar PNG
  el.onload = () => {
    studioImg = { id: "ia", el };
    $("#btnCrClearImg").hidden = false;
    $("#crImgHint").textContent = "Usando: criativo gerado por IA";
    if (window.renderCreativeStudio) window.renderCreativeStudio();
    toast("Criativo aplicado no Estúdio 🎨");
    location.hash = "#criativo";
  };
  el.onerror = () => toast("Não consegui carregar essa imagem 😕");
  el.src = url;
};

$("#btnCrPickImg").addEventListener("click", () => window.pickImage((id) => window.setStudioImage(id)));
$("#btnCrClearImg").addEventListener("click", () => {
  studioImg = null;
  $("#btnCrClearImg").hidden = true;
  $("#crImgHint").textContent = "Ou arraste uma imagem direto no preview ao lado →";
  if (window.renderCreativeStudio) window.renderCreativeStudio();
});

// arrastar imagem direto no preview do criativo
const crPrev = $("#crPreviewCard");
if (crPrev) {
  crPrev.addEventListener("dragover", (e) => e.preventDefault());
  crPrev.addEventListener("drop", async (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const rec = await addImageToGallery(f);
    if (rec) window.setStudioImage(rec.id);
  });
}
