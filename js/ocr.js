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

// PSM 6 = bloco uniforme (melhor pra parágrafos/copy); PSM 11 = texto esparso
// (melhor pra legendas/selos pequenos espalhados sobre foto de fundo)
async function ocrRecognizePass(worker, canvas, psm) {
  await worker.setParameters({ tessedit_pageseg_mode: psm });
  return worker.recognize(canvas);
}

// pré-processamento em 2 variantes pra pegar até texto MINÚSCULO:
// 1) ampliação agressiva + tons de cinza + contraste esticado + nitidez (unsharp mask)
// 2) a mesma base, mas binarizada (preto/branco puro via limiar de Otsu) —
//    essencial pra legendas/selos pequenos sobre fundo de foto "sujo"
async function ocrPreprocessVariants(file) {
  const img = await createImageBitmap(file);
  // amplia bem mais que antes: texto pequeno precisa de MUITOS pixels por letra
  let scale = Math.min(6, Math.max(1, 2600 / Math.min(img.width, img.height)));
  if (img.width * scale > 6000) scale = 6000 / img.width;
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = "high";
  cx.drawImage(img, 0, 0, w, h);
  const id = cx.getImageData(0, 0, w, h);
  const d = id.data;
  const n = d.length / 4;
  const gray = new Float32Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const y = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    gray[p] = y;
    hist[y | 0]++;
  }
  // estica o contraste entre os percentis 1.5% e 98.5%
  const total = n;
  let lo = 0, hi = 255, acc = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= total * 0.015) { lo = i; break; } }
  acc = 0;
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= total * 0.015) { hi = i; break; } }
  const rng = Math.max(1, hi - lo);
  for (let p = 0; p < n; p++) {
    let y = ((gray[p] - lo) * 255) / rng;
    gray[p] = y < 0 ? 0 : y > 255 ? 255 : y;
  }
  // nitidez (unsharp mask): realça bordas das letras, crucial em texto pequeno
  const sharp = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { sharp[p] = gray[p]; continue; }
      const c = gray[p], up = gray[p - w], down = gray[p + w], left = gray[p - 1], right = gray[p + 1];
      const v = c * 5 - up - down - left - right;
      sharp[p] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  // variante A: tons de cinza nítidos (melhor pra parágrafos/copy normal)
  const idA = cx.createImageData(w, h);
  for (let p = 0, i = 0; p < n; p++, i += 4) { idA.data[i] = idA.data[i + 1] = idA.data[i + 2] = sharp[p]; idA.data[i + 3] = 255; }
  const cvA = document.createElement("canvas"); cvA.width = w; cvA.height = h;
  cvA.getContext("2d").putImageData(idA, 0, 0);

  // limiar de Otsu → variante binarizada (preto/branco puro)
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, wF = 0, varMax = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (wB === 0) continue;
    wF = total - wB; if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > varMax) { varMax = between; threshold = t; }
  }
  const idB = cx.createImageData(w, h);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const v = sharp[p] > threshold ? 255 : 0;
    idB.data[i] = idB.data[i + 1] = idB.data[i + 2] = v; idB.data[i + 3] = 255;
  }
  const cvB = document.createElement("canvas"); cvB.width = w; cvB.height = h;
  cvB.getContext("2d").putImageData(idB, 0, 0);

  // variante C: binarizada INVERTIDA — TEXTO BRANCO/CLARO sobre foto (legendas
  // de card, nomes sobre imagem) vira preto sobre branco, que é o que o OCR lê.
  // Sem isso, "Spider Man" em branco vira "ider Man" ou some.
  const idC = cx.createImageData(w, h);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const v = sharp[p] > threshold ? 0 : 255;
    idC.data[i] = idC.data[i + 1] = idC.data[i + 2] = v; idC.data[i + 3] = 255;
  }
  const cvC = document.createElement("canvas"); cvC.width = w; cvC.height = h;
  cvC.getContext("2d").putImageData(idC, 0, 0);

  return { gray: cvA, bin: cvB, binInv: cvC };
}

// normaliza pra comparar/deduplicar texto entre as duas passadas
const ocrNorm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");

// "parece texto de verdade?" — barra lixo tipo "IY", "Ti | \\ »", "MARV 2B mivEnine"
function ocrLooksReal(t) {
  const s = (t || "").trim();
  if (s.length < 3) return false;
  const chars = [...s.replace(/\s+/g, "")];
  if (!chars.length) return false;
  const alnum = chars.filter((c) => /[a-z0-9à-öø-ÿ]/i.test(c)).length;
  if (alnum / chars.length < 0.62) return false; // símbolo demais (| \\ » = ~ etc.)
  const tokens = s.split(/\s+/).filter(Boolean);
  // token "de verdade": tem vogal, ou é número/preço, ou é sigla curta em maiúsculas
  const good = tokens.filter((w) =>
    /\d/.test(w) ||
    (/[aeiouáéíóúâêôãõàü]/i.test(w) && /[a-zà-ÿ]{2,}/i.test(w)) ||
    /^[A-Z]{2,5}[.,;:!?]?$/.test(w)
  );
  return good.length / tokens.length >= 0.6;
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
    status.textContent = "Preparando a imagem (ampliação 6x + nitidez + contraste)…";
    const { gray, bin, binInv } = await ocrPreprocessVariants(ocrFile);

    status.textContent = "Lendo parágrafos e copy…";
    const passA = await ocrRecognizePass(worker, gray, "6");
    // qualidade > quantidade: confiança alta passa direto; média só se PARECER texto real
    let parts = (passA.data.paragraphs || [])
      .filter((p) => {
        const conf = p.confidence || 0;
        const t = (p.text || "").replace(/\s*\n\s*/g, " ").trim();
        return t.length > 2 && (conf >= 60 || (conf >= 25 && ocrLooksReal(t)));
      })
      .map((p) => (p.text || "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim());
    if (!parts.length && passA.data.text) {
      parts = passA.data.text.split(/\n{2,}/)
        .map((t) => t.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim())
        .filter((t) => t.length > 2 && ocrLooksReal(t));
    }

    status.textContent = "Caçando texto minúsculo (selos, legendas, marcas d'água)…";
    const passB = await ocrRecognizePass(worker, bin, "11");
    status.textContent = "Lendo texto CLARO sobre foto (legendas brancas)…";
    const passC = await ocrRecognizePass(worker, binInv, "11");

    // junta as passadas B (texto escuro) e C (texto branco/claro invertido)
    const pool = [...(passB.data.lines || []), ...(passC.data.lines || [])]
      .filter((l) => (l.confidence || 0) >= 55 && ocrLooksReal(l.text))
      .map((l) => ({ t: l.text.trim().replace(/\s{2,}/g, " "), c: l.confidence || 0 }))
      // mais LONGOS primeiro: "Spider Man" entra antes e mata o fragmento "ider Man"
      .sort((a, b) => (b.t.length - a.t.length) || (b.c - a.c));

    const seen = new Set(parts.map(ocrNorm));
    const extra = [];
    for (const { t } of pool) {
      const k = ocrNorm(t);
      if (!k || seen.has(k)) continue;
      // pula se já está contido num parágrafo da passada A ou num achado maior
      if (parts.some((p) => ocrNorm(p).includes(k))) continue;
      if (extra.some((e) => ocrNorm(e).includes(k))) continue;
      seen.add(k);
      extra.push(t);
      if (extra.length >= 14) break; // só os melhores — nada de chuva de lixo
    }
    parts = [...parts, ...extra];

    if (!parts.length) {
      status.textContent = "Não encontrei texto legível nessa imagem 😕 Tente um print mais nítido e reto.";
      btn.disabled = false;
      return;
    }
    $("#ocrLines").innerHTML = parts
      .map(
        (t, i) => `<label class="ocr-line">
          <input type="checkbox" data-ocr-line checked />
          <span>${escHtml(t)}${i >= parts.length - extra.length ? ' <small class="hint">· texto pequeno</small>' : ""}</span>
        </label>`
      )
      .join("");
    $("#ocrResultCard").hidden = false;
    status.textContent = `${parts.length} trecho${parts.length > 1 ? "s" : ""} encontrado${parts.length > 1 ? "s" : ""}${extra.length ? ` (${extra.length} em texto pequeno)` : ""} — desmarque o que não quiser. (imagem já removida do visualizador)`;
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
