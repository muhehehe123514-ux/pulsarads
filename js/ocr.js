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

function setOcrFile(f) {
  if (!/^image\//.test(f.type)) return toast("Só imagens 📷");
  ocrFile = f;
  const url = URL.createObjectURL(f);
  $("#ocrPreview").hidden = false;
  $("#ocrPreview").innerHTML = `<img src="${url}" alt="Imagem pra extrair texto" style="max-width:280px;width:auto;height:auto;max-height:220px" />
    <dl><dt>Arquivo</dt><dd>${escHtml(f.name)}</dd></dl>`;
  $("#ocrDropText").textContent = "📷 " + f.name + " — clique pra trocar";
  $("#btnOcrRun").disabled = false;
  $("#ocrResultCard").hidden = true;
}

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

// worker reaproveitado entre extrações
let ocrWorker = null;
async function getOcrWorker(status) {
  if (ocrWorker) return ocrWorker;
  const logger = (m) => {
    if (m.status === "recognizing text") status.textContent = `Lendo a imagem… ${Math.round((m.progress || 0) * 100)}%`;
    else if (m.status) status.textContent = m.status.replace("loading", "carregando").replace("initializing", "iniciando") + "…";
  };
  // createWorker(lang, oem, options) — baixa core/worker/lang do jsDelivr
  ocrWorker = await Tesseract.createWorker("por", 1, {
    logger,
    workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@${TESS_VER}/dist/worker.min.js`,
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5",
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
  });
  return ocrWorker;
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
    status.textContent = "Lendo a imagem…";
    const { data } = await worker.recognize(ocrFile);
    // pega as linhas; se o build não trouxer .lines, quebra o texto em linhas
    let lines = (data.lines || []).map((l) => (l.text || "").trim()).filter((t) => t.length > 1);
    if (!lines.length && data.text) lines = data.text.split(/\r?\n/).map((t) => t.trim()).filter((t) => t.length > 1);
    if (!lines.length) {
      status.textContent = "Não encontrei texto legível nessa imagem 😕 Tente um print mais nítido e reto.";
      btn.disabled = false;
      return;
    }
    $("#ocrLines").innerHTML = lines
      .map(
        (t) => `<label class="ocr-line">
          <input type="checkbox" data-ocr-line checked />
          <span>${escHtml(t)}</span>
        </label>`
      )
      .join("");
    $("#ocrResultCard").hidden = false;
    status.textContent = `${lines.length} trecho${lines.length > 1 ? "s" : ""} encontrado${lines.length > 1 ? "s" : ""} — desmarque o que não quiser.`;
    $("#ocrResultCard").scrollIntoView({ behavior: "smooth", block: "start" });
    window.spendUse();
  } catch (err) {
    console.error("OCR:", err);
    status.textContent = "Erro no OCR: " + (err.message || err) + " — tente recarregar a página (Ctrl+F5).";
  }
  btn.disabled = false;
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
  copyText(sel.join("\n"), `${sel.length} trecho${sel.length > 1 ? "s" : ""} copiado${sel.length > 1 ? "s" : ""} 📋`);
});
