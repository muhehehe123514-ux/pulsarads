/* ============================================================
   PulsarAds — Imagem → Texto (OCR)
   Tesseract.js (carregado sob demanda via CDN), idioma pt.
   O usuário marca os trechos que quer (um ou vários) e copia.
   ============================================================ */

"use strict";

let ocrFile = null;
let ocrLoaded = false;

const ocrDrop = $("#ocrDrop");
ocrDrop.addEventListener("dragover", (e) => { e.preventDefault(); ocrDrop.classList.add("drag"); });
ocrDrop.addEventListener("dragleave", () => ocrDrop.classList.remove("drag"));
ocrDrop.addEventListener("drop", (e) => {
  e.preventDefault();
  ocrDrop.classList.remove("drag");
  if (e.dataTransfer.files[0]) setOcrFile(e.dataTransfer.files[0]);
});
$("#ocrFile").addEventListener("change", (e) => {
  if (e.target.files[0]) setOcrFile(e.target.files[0]);
  e.target.value = "";
});

// colar imagem da área de transferência (Ctrl+V / Cmd+V) — só quando o OCR está aberto
window.addEventListener("paste", (e) => {
  if (location.hash !== "#ocr") return;
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (const it of items) {
    if (it.type && it.type.indexOf("image") === 0) {
      const f = it.getAsFile();
      if (f) { setOcrFile(f); toast("Imagem colada 📋 — clique em Extrair texto"); e.preventDefault(); }
      return;
    }
  }
});

let ocrPreviewUrl = null;

function setOcrFile(f) {
  if (!/^image\//.test(f.type)) return toast("Só imagens 📷");
  ocrFile = f;
  if (ocrPreviewUrl) URL.revokeObjectURL(ocrPreviewUrl);
  ocrPreviewUrl = URL.createObjectURL(f);
  $("#ocrPreview").hidden = false;
  $("#ocrPreview").innerHTML = `<img src="${ocrPreviewUrl}" alt="Imagem pra extrair texto" style="max-width:280px;width:auto;height:auto;max-height:220px" />
    <dl><dt>Arquivo</dt><dd>${escHtml(f.name)}</dd></dl>`;
  $("#ocrDropText").textContent = "📷 " + f.name + " — clique pra trocar";
  $("#btnOcrRun").disabled = false;
  $("#btnOcrClear").hidden = false;
  $("#ocrResultCard").hidden = true;
}

// remove a imagem do visualizador (pode ser antes OU depois de extrair)
function clearOcrImage(keepResults) {
  ocrFile = null;
  if (ocrPreviewUrl) { URL.revokeObjectURL(ocrPreviewUrl); ocrPreviewUrl = null; }
  $("#ocrPreview").hidden = true;
  $("#ocrPreview").innerHTML = "";
  $("#ocrDropText").innerHTML = "📷 Clique, arraste, ou copie uma imagem e cole com <kbd>Ctrl</kbd>+<kbd>V</kbd>";
  $("#btnOcrRun").disabled = true;
  $("#btnOcrClear").hidden = true;
  if (!keepResults) { $("#ocrResultCard").hidden = true; $("#ocrStatus").textContent = "Na primeira extração o motor de OCR (~15 MB) é baixado — depois fica em cache."; }
}
$("#btnOcrClear").addEventListener("click", () => { clearOcrImage(false); toast("Imagem removida 🗑️"); });

const TESS_VER = "5.1.1";
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESS_VER}/dist/tesseract.min.js`;
    s.onload = () => { ocrLoaded = true; resolve(); };
    s.onerror = () => reject(new Error("Não consegui baixar o motor de OCR (verifique a internet)."));
    document.head.appendChild(s);
  });
}

// worker reaproveitado entre extrações — português + inglês juntos
let ocrWorker = null;
async function getOcrWorker(status) {
  if (ocrWorker) return ocrWorker;
  const logger = (m) => {
    if (m.status === "recognizing text") status.textContent = `Lendo a imagem… ${Math.round((m.progress || 0) * 100)}%`;
    else if (m.status) status.textContent = m.status.replace("loading", "carregando").replace("initializing", "iniciando") + "…";
  };
  // createWorker(lang, oem, options) — baixa core/worker/lang do jsDelivr
  ocrWorker = await Tesseract.createWorker("por+eng", 1, {
    logger,
    workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@${TESS_VER}/dist/worker.min.js`,
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5",
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
  });
  await ocrWorker.setParameters({ preserve_interword_spaces: "1" });
  return ocrWorker;
}

// pré-processamento que faz o OCR "enxergar" qualquer print:
// amplia a imagem, converte pra tons de cinza e estica o contraste
async function ocrPreprocess(file) {
  const img = await createImageBitmap(file);
  let scale = Math.min(3, Math.max(1, 1600 / Math.min(img.width, img.height)));
  if (img.width * scale > 4200) scale = 4200 / img.width;
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = "high";
  cx.drawImage(img, 0, 0, w, h);
  const id = cx.getImageData(0, 0, w, h);
  const d = id.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const y = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    d[i] = y;
    hist[y]++;
  }
  // estica o contraste entre os percentis 2% e 98%
  const total = d.length / 4;
  let lo = 0, hi = 255, acc = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= total * 0.02) { lo = i; break; } }
  acc = 0;
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= total * 0.02) { hi = i; break; } }
  const rng = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    let y = ((d[i] - lo) * 255) / rng;
    y = y < 0 ? 0 : y > 255 ? 255 : y;
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  cx.putImageData(id, 0, 0);
  return cv;
}

$("#btnOcrRun").addEventListener("click", async () => {
  if (!ocrFile) return;
  if (!window.canUse()) return;
  const btn = $("#btnOcrRun");
  btn.disabled = true;
  const status = $("#ocrStatus");
  try {
    status.textContent = "Carregando o motor de OCR (só na 1ª vez)…";
    await loadTesseract();
    const worker = await getOcrWorker(status);
    status.textContent = "Preparando a imagem (ampliação + contraste)…";
    const prepped = await ocrPreprocess(ocrFile);
    status.textContent = "Lendo a imagem…";
    const { data } = await worker.recognize(prepped);
    // monta PARÁGRAFOS (não linhas soltas) — melhor pra copiar copies inteiras
    let parts = (data.paragraphs || [])
      .map((p) => (p.text || "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim())
      .filter((t) => t.length > 2);
    if (!parts.length && data.text) {
      parts = data.text.split(/\n{2,}/)
        .map((t) => t.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim())
        .filter((t) => t.length > 2);
    }
    if (!parts.length && data.text) parts = data.text.split(/\r?\n/).map((t) => t.trim()).filter((t) => t.length > 1);
    if (!parts.length) {
      status.textContent = "Não encontrei texto legível nessa imagem 😕 Tente um print mais nítido e reto.";
      btn.disabled = false;
      return;
    }
    $("#ocrLines").innerHTML = parts
      .map(
        (t) => `<label class="ocr-line">
          <input type="checkbox" data-ocr-line checked />
          <span>${escHtml(t)}</span>
        </label>`
      )
      .join("");
    $("#ocrResultCard").hidden = false;
    status.textContent = `${parts.length} parágrafo${parts.length > 1 ? "s" : ""}/trecho${parts.length > 1 ? "s" : ""} encontrado${parts.length > 1 ? "s" : ""} — desmarque o que não quiser. (imagem já removida do visualizador)`;
    window.spendUse();
    // remove a imagem do visualizador automaticamente, mantendo o resultado
    clearOcrImage(true);
    $("#ocrResultCard").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error("OCR:", err);
    status.textContent = "Erro no OCR: " + (err.message || err) + " — tente recarregar a página (Ctrl+F5).";
  }
  // só reabilita se ainda houver imagem (após sucesso ela é removida)
  btn.disabled = !ocrFile;
});

$("#btnOcrAll").addEventListener("click", () => {
  const boxes = $$("#ocrLines [data-ocr-line]");
  const allOn = boxes.every((b) => b.checked);
  boxes.forEach((b) => (b.checked = !allOn));
});

$("#btnOcrCopy").addEventListener("click", () => {
  const sel = $$("#ocrLines .ocr-line")
    .filter((l) => l.querySelector("input").checked)
    .map((l) => l.querySelector("span").textContent);
  if (!sel.length) return toast("Marque pelo menos um trecho ✅");
  copyText(sel.join("\n\n"), `${sel.length} trecho${sel.length > 1 ? "s" : ""} copiado${sel.length > 1 ? "s" : ""} 📋`);
});
