/* ============================================================
   PulsarAds — Meta Ads ao vivo
   Marketing API oficial da Meta (graph.facebook.com) via token
   do próprio usuário. O token fica só no localStorage e é
   enviado exclusivamente ao graph.facebook.com.
   ============================================================ */

"use strict";

const GRAPH = "https://graph.facebook.com/v23.0";
const FB_TOKEN_KEY = "pulsar_fb_token";
const FB_ACC_KEY = "pulsar_fb_account";

let fbToken = localStorage.getItem(FB_TOKEN_KEY) || "";
let fbCampaigns = [];
let fbCurrency = "BRL";

const fbMoney = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: fbCurrency }).format(v);

async function gGet(path, params = {}) {
  const u = new URL(GRAPH + path);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  u.searchParams.set("access_token", fbToken);
  const res = await fetch(u);
  const json = await res.json();
  if (json.error) throw json.error;
  return json;
}

async function gPost(path, params = {}) {
  const body = new URLSearchParams({ ...params, access_token: fbToken });
  const res = await fetch(GRAPH + path, { method: "POST", body });
  const json = await res.json();
  if (json.error) throw json.error;
  return json;
}

function fbShowError(err) {
  const card = $("#fbError");
  card.hidden = false;
  const expired = err.code === 190;
  card.innerHTML = `<h3>${expired ? "⏰ Token expirado ou inválido" : "⚠️ Erro da API da Meta"}</h3>
    <p class="hint" style="margin-top:8px">${escHtml(err.message || String(err))}</p>
    ${expired ? `<p class="hint">Gere um novo token no Graph API Explorer e conecte de novo.</p>` : ""}
    <div class="form-actions" style="margin-top:12px">
      <button class="btn btn-ghost btn-sm" id="btnFbErrReset">Trocar token</button>
    </div>`;
  $("#btnFbErrReset").addEventListener("click", fbLogout);
}

function fbSetUI(connected) {
  $("#fbConnectCard").hidden = connected;
  $("#fbDash").hidden = !connected;
  $("#fbError").hidden = true;
}

function fbLogout() {
  localStorage.removeItem(FB_TOKEN_KEY);
  localStorage.removeItem(FB_ACC_KEY);
  fbToken = "";
  fbCampaigns = [];
  $("#fbToken").value = "";
  fbSetUI(false);
  toast("Desconectado. Token removido deste navegador 🔒");
}

async function fbConnect() {
  const t = $("#fbToken").value.trim();
  if (!t) return toast("Cole o token primeiro 📡");
  fbToken = t;
  try {
    const me = await gGet("/me", { fields: "name" });
    localStorage.setItem(FB_TOKEN_KEY, fbToken);
    $("#fbWho").textContent = `Conectado como ${me.name}`;
    fbSetUI(true);
    toast(`Conectado como ${me.name} 📡`);
    await fbLoadAccounts();
  } catch (err) {
    fbToken = "";
    fbShowError(err);
  }
}

async function fbLoadAccounts() {
  try {
    const res = await gGet("/me/adaccounts", {
      fields: "name,account_id,account_status,currency",
      limit: "100",
    });
    const accs = res.data || [];
    if (!accs.length) {
      $("#fbStatus").textContent = "Nenhuma conta de anúncios encontrada nesse usuário.";
      return;
    }
    const savedAcc = localStorage.getItem(FB_ACC_KEY);
    $("#fbAccount").innerHTML = accs
      .map(
        (a) =>
          `<option value="${a.id}" data-currency="${a.currency}" ${a.id === savedAcc ? "selected" : ""}>
            ${escHtml(a.name)} (${a.account_id})${a.account_status !== 1 ? " · inativa" : ""}
          </option>`
      )
      .join("");
    await fbLoadCampaigns();
  } catch (err) {
    fbShowError(err);
  }
}

function pickAction(list, types) {
  if (!list) return 0;
  for (const t of types) {
    const hit = list.find((a) => a.action_type === t);
    if (hit) return parseFloat(hit.value) || 0;
  }
  return 0;
}

async function fbLoadCampaigns() {
  const accSel = $("#fbAccount");
  if (!accSel.value) return;
  fbCurrency = accSel.selectedOptions[0]?.dataset.currency || "BRL";
  localStorage.setItem(FB_ACC_KEY, accSel.value);
  const preset = $("#fbPeriod").value;
  $("#fbStatus").textContent = "Carregando campanhas ao vivo…";
  $("#fbTable tbody").innerHTML = "";
  try {
    const res = await gGet(`/${accSel.value}/campaigns`, {
      fields:
        `name,status,effective_status,objective,daily_budget,lifetime_budget,` +
        `insights.date_preset(${preset}){spend,impressions,clicks,inline_link_clicks,ctr,cpc,actions,action_values,purchase_roas}`,
      limit: "100",
    });
    fbCampaigns = (res.data || []).map((c) => {
      const ins = c.insights?.data?.[0] || {};
      const purchases = pickAction(ins.actions, ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"]);
      const revenue = pickAction(ins.action_values, ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"]);
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        eff: c.effective_status,
        objective: (c.objective || "").replace("OUTCOME_", "").toLowerCase(),
        budget: c.daily_budget ? +c.daily_budget / 100 : null,
        spend: parseFloat(ins.spend) || 0,
        impressions: parseInt(ins.impressions) || 0,
        clicks: parseInt(ins.clicks) || 0,
        ctr: parseFloat(ins.ctr) || 0,
        cpc: parseFloat(ins.cpc) || 0,
        purchases,
        revenue,
        roas: parseFloat(ins.purchase_roas?.[0]?.value) || (ins.spend > 0 && revenue ? revenue / ins.spend : 0),
        // etapas do funil de conversão (pixel)
        linkClicks: parseInt(ins.inline_link_clicks) || pickAction(ins.actions, ["link_click"]),
        lpv: pickAction(ins.actions, ["omni_landing_page_view", "landing_page_view"]),
        ic: pickAction(ins.actions, ["omni_initiated_checkout", "initiate_checkout", "offsite_conversion.fb_pixel_initiate_checkout"]),
        payInfo: pickAction(ins.actions, ["add_payment_info", "offsite_conversion.fb_pixel_add_payment_info"]),
      };
    });
    saveMetaSnapshot(preset);
    renderFbDash();
    renderFunnelSelect();
    renderFunnel();
  } catch (err) {
    fbShowError(err);
  }
}
window.fbLoadCampaigns = fbLoadCampaigns;

// ---------- snapshot pro Rastreador de Vendas (sincronização automática) ----------
const META_SNAP_KEY = "pulsar_meta_snapshot";
const PERIOD_LABEL = { today: "hoje", yesterday: "ontem", last_7d: "últimos 7 dias", last_30d: "últimos 30 dias", maximum: "período máximo" };

function saveMetaSnapshot(preset) {
  localStorage.setItem(
    META_SNAP_KEY,
    JSON.stringify({
      when: new Date().toISOString(),
      period: preset,
      periodLabel: PERIOD_LABEL[preset] || preset,
      currency: fbCurrency,
      campaigns: fbCampaigns.map((c) => ({
        name: c.name, spend: c.spend, purchases: c.purchases, revenue: c.revenue,
        clicks: c.clicks, linkClicks: c.linkClicks, lpv: c.lpv, ic: c.ic, payInfo: c.payInfo,
        impressions: c.impressions, ctr: c.ctr, cpc: c.cpc,
      })),
    })
  );
  if (window.renderVendas) window.renderVendas();
  if (window.renderScaleLive) window.renderScaleLive();
}

// ---------- Funil de Conversão por campanha ----------
const FUNNEL_STAGES = [
  { key: "linkClicks", label: "Cliques" },
  { key: "lpv", label: "Vis. Página" },
  { key: "ic", label: "ICs" },
  { key: "payInfo", label: "Info Pagto." },
  { key: "purchases", label: "Compras" },
];

function renderFunnelSelect() {
  const sel = $("#fnCampaign");
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML =
    `<option value="-1">Todas as campanhas (somadas)</option>` +
    fbCampaigns.map((c, i) => `<option value="${i}">${escHtml(c.name)}</option>`).join("");
  if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
}

function renderFunnel() {
  const root = $("#funnelChart");
  if (!root) return;
  if (!fbCampaigns.length) {
    root.innerHTML = `<div class="viz-empty">Conecte a conta e carregue as campanhas pra ver o funil.</div>`;
    return;
  }
  const sel = +($("#fnCampaign").value ?? -1);
  const src =
    sel >= 0
      ? fbCampaigns[sel]
      : fbCampaigns.reduce(
          (t, c) => {
            FUNNEL_STAGES.forEach((s) => (t[s.key] += c[s.key] || 0));
            return t;
          },
          { linkClicks: 0, lpv: 0, ic: 0, payInfo: 0, purchases: 0 }
        );

  const values = FUNNEL_STAGES.map((s) => src[s.key] || 0);
  const base = values[0];
  if (!base) {
    root.innerHTML = `<div class="viz-empty">Sem cliques registrados nesse período — o funil aparece quando houver tráfego.</div>`;
    return;
  }

  const W = 760, H = 320, mT = 46, mB = 44, mX = 10;
  const plotH = H - mT - mB;
  const n = FUNNEL_STAGES.length;
  const segW = (W - mX * 2) / n;
  const trans = Math.min(38, segW * 0.28);
  const midY = mT + plotH / 2;
  const hOf = (v) => Math.max((v / base) * plotH, 8);

  // caminho contínuo com transições suaves entre etapas
  let top = "";
  values.forEach((v, i) => {
    const x0 = mX + segW * i, x1 = x0 + segW;
    const y = midY - hOf(v) / 2;
    top += i === 0 ? `M${x0},${y}` : "";
    top += ` L${x1 - (i < n - 1 ? trans : 0)},${y}`;
    if (i < n - 1) {
      const yn = midY - hOf(values[i + 1]) / 2;
      top += ` C${x1},${y} ${x1},${yn} ${x1 + trans},${yn}`;
    }
  });
  let bottom = "";
  for (let i = n - 1; i >= 0; i--) {
    const x0 = mX + segW * i, x1 = x0 + segW;
    const y = midY + hOf(values[i]) / 2;
    bottom += ` L${x1},${y} L${x0 + (i > 0 ? trans : 0)},${y}`;
    if (i > 0) {
      const yp = midY + hOf(values[i - 1]) / 2;
      bottom += ` C${x0},${y} ${x0},${yp} ${x0 - trans},${yp}`;
    }
  }

  const seps = FUNNEL_STAGES.slice(1)
    .map((_, i) => {
      const x = mX + segW * (i + 1);
      return `<line x1="${x}" y1="${mT - 26}" x2="${x}" y2="${H - mB + 8}" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>`;
    })
    .join("");

  const labels = FUNNEL_STAGES.map((s, i) => {
    const cx = mX + segW * i + segW / 2;
    const pct = ((values[i] / base) * 100).toFixed(1).replace(".", ",") + "%";
    return `
      <text x="${cx}" y="${mT - 28}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text-2)" font-family="Inter,sans-serif">${s.label}</text>
      <text x="${cx}" y="${midY + 6}" text-anchor="middle" font-size="17" font-weight="700" fill="#ffffff" font-family="Space Grotesk,Inter,sans-serif" stroke="rgba(0,0,0,0.35)" stroke-width="3" style="paint-order:stroke">${pct}</text>
      <text x="${cx}" y="${H - 14}" text-anchor="middle" font-size="13" fill="var(--muted)" font-family="Inter,sans-serif">${NUM.format(values[i])}</text>`;
  }).join("");

  root.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Funil de conversão da campanha">
    <defs>
      <linearGradient id="fnGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#3987e5"/>
        <stop offset="0.55" stop-color="#9085e9"/>
        <stop offset="1" stop-color="#d55181"/>
      </linearGradient>
    </defs>
    <path d="${top}${bottom} Z" fill="url(#fnGrad)" opacity="0.92"/>
    ${seps}${labels}
  </svg>`;
}

// ---------- dashboard ----------
function renderFbDash() {
  const tot = fbCampaigns.reduce(
    (t, c) => ({
      spend: t.spend + c.spend,
      impr: t.impr + c.impressions,
      clicks: t.clicks + c.clicks,
      purch: t.purch + c.purchases,
      rev: t.rev + c.revenue,
    }),
    { spend: 0, impr: 0, clicks: 0, purch: 0, rev: 0 }
  );
  $("#fbSpend").textContent = fbMoney(tot.spend);
  $("#fbImpr").textContent = NUM.format(tot.impr);
  $("#fbClicks").textContent = NUM.format(tot.clicks);
  $("#fbPurch").textContent = NUM.format(tot.purch);
  $("#fbRev").textContent = fbMoney(tot.rev);
  $("#fbRoas").textContent = tot.spend > 0 && tot.rev > 0 ? (tot.rev / tot.spend).toFixed(2) + "x" : "—";

  const active = fbCampaigns.filter((c) => c.eff === "ACTIVE").length;
  $("#fbStatus").textContent = fbCampaigns.length
    ? `${fbCampaigns.length} campanhas · ${active} ativas · dados ao vivo da Marketing API`
    : "Nenhuma campanha nessa conta.";

  $("#fbTable tbody").innerHTML = fbCampaigns
    .map((c, i) => {
      const on = c.eff === "ACTIVE";
      const pill = on
        ? `<span class="pill pill-on">● ativa</span>`
        : c.eff === "PAUSED" || c.status === "PAUSED"
        ? `<span class="pill pill-off">⏸ pausada</span>`
        : `<span class="pill pill-warn">${escHtml((c.eff || "").toLowerCase().replace(/_/g, " "))}</span>`;
      return `<tr>
        <td>${pill}</td>
        <td>${escHtml(c.name)}</td>
        <td>${escHtml(c.objective || "—")}</td>
        <td>${c.budget != null ? fbMoney(c.budget) : "—"}</td>
        <td>${fbMoney(c.spend)}</td>
        <td>${NUM.format(c.clicks)}</td>
        <td>${c.ctr ? c.ctr.toFixed(2) + "%" : "—"}</td>
        <td>${c.cpc ? fbMoney(c.cpc) : "—"}</td>
        <td>${c.purchases || "—"}</td>
        <td>${c.revenue ? fbMoney(c.revenue) : "—"}</td>
        <td class="${c.roas >= 1 ? "pos" : c.roas > 0 ? "neg" : ""}">${c.roas ? c.roas.toFixed(2) + "x" : "—"}</td>
        <td><button class="btn-copy" data-fb-toggle="${i}">${on ? "⏸ Pausar" : "▶ Ativar"}</button></td>
      </tr>`;
    })
    .join("");
}

$("#fbTable").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-fb-toggle]");
  if (!btn) return;
  const c = fbCampaigns[+btn.dataset.fbToggle];
  const goal = c.eff === "ACTIVE" ? "PAUSED" : "ACTIVE";
  const verb = goal === "PAUSED" ? "PAUSAR" : "ATIVAR";
  if (!confirm(`${verb} a campanha "${c.name}" agora? Isso muda a veiculação real no Meta Ads.`)) return;
  btn.disabled = true;
  btn.textContent = "…";
  try {
    await gPost(`/${c.id}`, { status: goal });
    toast(`Campanha ${goal === "PAUSED" ? "pausada ⏸" : "ativada ▶"}`);
    await fbLoadCampaigns();
  } catch (err) {
    btn.disabled = false;
    if (err.code === 200 || /permission/i.test(err.message || "")) {
      toast("Token sem ads_management — gere um novo com essa permissão 🔑");
    } else fbShowError(err);
  }
});

// ---------- bindings ----------
$("#fnCampaign").addEventListener("change", renderFunnel);
$("#btnFbConnect").addEventListener("click", fbConnect);
$("#fbToken").addEventListener("keydown", (e) => { if (e.key === "Enter") fbConnect(); });
$("#btnFbLogout").addEventListener("click", fbLogout);
$("#btnFbRefresh").addEventListener("click", fbLoadCampaigns);
$("#fbAccount").addEventListener("change", fbLoadCampaigns);
$("#fbPeriod").addEventListener("change", fbLoadCampaigns);

// reconecta sozinho se já houver token salvo
if (fbToken) {
  fbSetUI(true);
  $("#fbWho").textContent = "Reconectando…";
  gGet("/me", { fields: "name" })
    .then((me) => {
      $("#fbWho").textContent = `Conectado como ${me.name}`;
      return fbLoadAccounts();
    })
    .catch((err) => {
      fbSetUI(false);
      fbShowError(err);
    });
}
