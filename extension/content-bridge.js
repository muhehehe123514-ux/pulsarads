/* PulsarAds Espelho — ponte entre a página do PulsarAds e a extensão.
   O site fala por window.postMessage; aqui a gente repassa pro background
   e devolve o resultado. Assim o site "descobre" que a skill está instalada. */
"use strict";

// marca no próprio HTML que a extensão está presente (sinal à prova de timing)
try { document.documentElement.setAttribute("data-pulsar-ext", "1"); } catch (e) {}

// avisa o site que a extensão está ativa (repete um pouco até o site carregar)
function announce() {
  try { document.documentElement.setAttribute("data-pulsar-ext", "1"); } catch (e) {}
  window.postMessage({ app: "pulsarads-ext", type: "ready", version: "1.0.0" }, "*");
}
announce();
document.addEventListener("DOMContentLoaded", announce);
setTimeout(announce, 500);
setTimeout(announce, 1500);
setTimeout(announce, 3000);

window.addEventListener("message", (ev) => {
  const d = ev.data;
  if (ev.source !== window || !d || d.app !== "pulsarads") return;

  if (d.cmd === "ping") {
    chrome.runtime.sendMessage({ cmd: "ping" }, () => {
      window.postMessage({ app: "pulsarads-ext", type: "pong", reqId: d.reqId }, "*");
    });
  }
  if (d.cmd === "searchMirror") {
    chrome.runtime.sendMessage({ cmd: "searchMirror", queries: d.queries, country: d.country, round: d.round || 1, exclude: d.exclude || [] }, (resp) => {
      window.postMessage({ app: "pulsarads-ext", type: "result", reqId: d.reqId, ads: (resp && resp.ads) || [], total: (resp && resp.total) || null }, "*");
    });
  }
});
