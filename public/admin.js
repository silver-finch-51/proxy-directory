// Admin panel: login (admin + ADMIN_PASSWORD), then CRUD for apps and
// airports, site-name settings, and manual star refresh.
// Token is stored in localStorage and sent as Authorization: Bearer.

const $ = (s, el = document) => el.querySelector(s);
const TOKEN_KEY = "admin_token";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function api(path, { method = "GET", body = undefined } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(getToken() ? { authorization: "Bearer " + getToken() } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `请求失败（${res.status}）`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function showMsg(text, isError = false) {
  const el = $("#adminMsg");
  el.textContent = text;
  el.className = isError ? "error" : "muted";
}

// ---------- login ----------
function showLogin() {
  $("#loginBox").hidden = false;
  $("#adminBox").hidden = true;
  clearToken();
}

function showAdmin() {
  $("#loginBox").hidden = true;
  $("#adminBox").hidden = false;
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const errEl = $("#loginErr");
  errEl.hidden = true;
  try {
    const data = await api("/api/admin/login", {
      method: "POST",
      body: { username: fd.get("username"), password: fd.get("password") },
    });
    setToken(data.token);
    showAdmin();
    await loadAll();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
});

$("#logoutBtn").addEventListener("click", showLogin);

// ---------- tabs ----------
document.querySelectorAll(".tabs [data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabs [data-tab]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    for (const name of ["apps", "airports", "vps", "settings"]) {
      $("#tab-" + name).hidden = name !== btn.dataset.tab;
    }
  });
});

// ---------- apps ----------
let apps = [];

const APP_FIELDS = [
  ["name", "名称", "text", true],
  ["slug", "slug（新建时必填，创建后不可改）", "text", true],
  ["alias", "别名", "text", false],
  ["tag", "标签", "text", false],
  ["description", "介绍", "textarea", false],
  ["note", "备注", "textarea", false],
  ["platforms", "平台（逗号分隔，如 Android, iOS, Windows）", "text", false],
  ["cores", "内核（逗号分隔，如 Mihomo, sing-box）", "text", false],
  ["core", "主内核", "text", false],
  ["sourceStatus", "源码状态（开源 / 未公开 / 源码不完整）", "text", false],
  ["priceStatus", "费用（free / paid）", "text", false],
  ["priceUsd", "价格（美元，免费填 0）", "number", false],
  ["pricingLabel", "价格说明", "text", false],
  ["downloadUrl", "下载链接", "url", true],
  ["downloadLabel", "下载按钮文字", "text", false],
  ["officialUrl", "官网链接", "url", false],
  ["latestVersion", "最新版本", "text", false],
  ["lastUpdated", "最近更新（日期）", "date", false],
  ["githubRepo", "GitHub 仓库（owner/repo，无仓库留空）", "text", false],
  ["iconUrl", "图标 URL（留空则不显示图标）", "url", false],
];

function appFormHtml(app) {
  const v = (k) => (app ? app[k] ?? "" : "");
  return `<form id="appForm" class="stacked">
    ${APP_FIELDS.map(([key, label, type]) => {
      if (key === "slug" && app) {
        return `<label>${esc(label)}<input name="slug" type="text" value="${esc(v("slug"))}" disabled></label>`;
      }
      if (type === "textarea") {
        return `<label>${esc(label)}<textarea name="${key}" rows="3">${esc(v(key))}</textarea></label>`;
      }
      return `<label>${esc(label)}<input name="${key}" type="${type}" value="${esc(v(key))}"></label>`;
    }).join("")}
    <div class="row">
      <label><input name="openSource" type="checkbox" ${app && app.openSource ? "checked" : ""}> 开源</label>
      <label><input name="published" type="checkbox" ${!app || app.published !== false ? "checked" : ""}> 上架</label>
    </div>
    <div>
      <button type="submit">${app ? "保存修改" : "创建应用"}</button>
      <button type="button" class="secondary" id="cancelAppForm">取消</button>
    </div>
  </form>`;
}

function renderApps() {
  const tbody = $("#appTable tbody");
  tbody.innerHTML = apps.map((a) => `<tr>
    <td><strong>${esc(a.name)}</strong><br><span class="muted">${esc(a.slug)}</span></td>
    <td>${esc((a.platforms || []).join(" / "))}</td>
    <td>${a.stars !== null && a.stars !== undefined ? Number(a.stars).toLocaleString("en-US") : "—"}</td>
    <td>${a.published !== false ? "上架" : "下架"}</td>
    <td>
      <button class="secondary" data-edit-app="${esc(a.slug)}">编辑</button>
      <button class="danger" data-del-app="${esc(a.slug)}">删除</button>
    </td>
  </tr>`).join("");
  tbody.querySelectorAll("[data-edit-app]").forEach((b) =>
    b.addEventListener("click", () => openAppForm(apps.find((a) => a.slug === b.dataset.editApp))));
  tbody.querySelectorAll("[data-del-app]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm(`确定删除 ${b.dataset.delApp} 吗？`)) return;
      try {
        await api("/api/admin/apps/" + encodeURIComponent(b.dataset.delApp), { method: "DELETE" });
        showMsg("已删除。");
        await loadApps();
      } catch (err) { showMsg(err.message, true); }
    }));
}

function openAppForm(app) {
  const wrap = $("#appFormWrap");
  wrap.innerHTML = appFormHtml(app || null);
  const form = $("#appForm");
  $("#cancelAppForm").addEventListener("click", () => { wrap.innerHTML = ""; });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {};
    for (const [key] of APP_FIELDS) {
      const val = fd.get(key);
      body[key] = val === null ? "" : val;
    }
    body.openSource = fd.get("openSource") === "on";
    body.published = fd.get("published") === "on";
    if (body.priceUsd !== "") body.priceUsd = Number(body.priceUsd);
    try {
      if (app) {
        await api("/api/admin/apps/" + encodeURIComponent(app.slug), { method: "PUT", body });
        showMsg("已保存。");
      } else {
        await api("/api/admin/apps", { method: "POST", body });
        showMsg("已创建。");
      }
      wrap.innerHTML = "";
      await loadApps();
    } catch (err) { showMsg(err.message, true); }
  });
  form.scrollIntoView({ behavior: "smooth" });
}

$("#newAppBtn").addEventListener("click", () => openAppForm(null));

async function loadApps() {
  const data = await api("/api/admin/apps");
  apps = data.apps || [];
  renderApps();
}

// ---------- airports ----------
let airports = [];

const AIRPORT_FIELDS = [
  ["name", "名称", "text", true],
  ["officialUrl", "官网链接", "url", false],
  ["iconUrl", "图标 URL（留空则不显示图标）", "url", false],
  ["price", "价格（如 ¥12/月 · 100GB）", "text", false],
  ["traffic", "流量（如 100GB/月）", "text", false],
  ["nodes", "节点（如 香港/日本/美国）", "text", false],
  ["notes", "备注", "textarea", false],
  ["sortOrder", "排序（数字越小越靠前）", "number", false],
];

function airportFormHtml(a) {
  const v = (k) => (a ? a[k] ?? "" : "");
  return `<form id="airportForm" class="stacked">
    ${AIRPORT_FIELDS.map(([key, label, type]) => {
      if (type === "textarea") {
        return `<label>${esc(label)}<textarea name="${key}" rows="3">${esc(v(key))}</textarea></label>`;
      }
      return `<label>${esc(label)}<input name="${key}" type="${type}" value="${esc(v(key))}"></label>`;
    }).join("")}
    <div class="row">
      <label><input name="recommended" type="checkbox" ${a && a.recommended ? "checked" : ""}> 推荐</label>
      <label><input name="offline" type="checkbox" ${a && a.offline ? "checked" : ""}> 下架</label>
    </div>
    <div>
      <button type="submit">${a ? "保存修改" : "创建机场"}</button>
      <button type="button" class="secondary" id="cancelAirportForm">取消</button>
    </div>
  </form>`;
}

function renderAirports() {
  const tbody = $("#airportTable tbody");
  tbody.innerHTML = airports.map((a) => `<tr>
    <td><strong>${esc(a.name)}</strong>${a.recommended ? " ★" : ""}</td>
    <td>${esc(a.price || "—")}</td>
    <td>${a.sortOrder ?? 0}</td>
    <td>${a.offline ? "下架" : "上架"}</td>
    <td>
      <button class="secondary" data-edit-apt="${esc(a.id)}">编辑</button>
      <button class="danger" data-del-apt="${esc(a.id)}">删除</button>
    </td>
  </tr>`).join("");
  tbody.querySelectorAll("[data-edit-apt]").forEach((b) =>
    b.addEventListener("click", () => openAirportForm(airports.find((x) => x.id === b.dataset.editApt))));
  tbody.querySelectorAll("[data-del-apt]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("确定删除这个机场吗？")) return;
      try {
        await api("/api/admin/airports/" + encodeURIComponent(b.dataset.delApt), { method: "DELETE" });
        showMsg("已删除。");
        await loadAirports();
      } catch (err) { showMsg(err.message, true); }
    }));
}

function openAirportForm(a) {
  const wrap = $("#airportFormWrap");
  wrap.innerHTML = airportFormHtml(a || null);
  const form = $("#airportForm");
  $("#cancelAirportForm").addEventListener("click", () => { wrap.innerHTML = ""; });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {};
    for (const [key] of AIRPORT_FIELDS) body[key] = fd.get(key) ?? "";
    if (body.sortOrder !== "") body.sortOrder = Number(body.sortOrder);
    body.recommended = fd.get("recommended") === "on";
    body.offline = fd.get("offline") === "on";
    try {
      if (a) {
        await api("/api/admin/airports/" + encodeURIComponent(a.id), { method: "PUT", body });
        showMsg("已保存。");
      } else {
        await api("/api/admin/airports", { method: "POST", body });
        showMsg("已创建。");
      }
      wrap.innerHTML = "";
      await loadAirports();
    } catch (err) { showMsg(err.message, true); }
  });
  form.scrollIntoView({ behavior: "smooth" });
}

$("#newAirportBtn").addEventListener("click", () => openAirportForm(null));

async function loadAirports() {
  const data = await api("/api/admin/airports");
  airports = data.airports || [];
  renderAirports();
}

// ---------- vps ----------
let vpsList = [];

const TIER_LABEL = { cheap: "便宜", mid: "中等", premium: "高端" };

const VPS_FIELDS = [
  ["name", "名称", "text", true],
  ["officialUrl", "官网链接", "url", false],
  ["tier", "档位（cheap 便宜 / mid 中等 / premium 高端）", "text", false],
  ["price", "价格（如 $5/月起）", "text", false],
  ["cpu", "CPU（如 1核）", "text", false],
  ["memory", "内存（如 1GB）", "text", false],
  ["disk", "硬盘（如 25GB SSD）", "text", false],
  ["bandwidth", "流量（如 1TB/月）", "text", false],
  ["locations", "机房（如 洛杉矶、东京、新加坡）", "text", false],
  ["notes", "备注", "textarea", false],
  ["iconUrl", "图标 URL（留空则不显示图标）", "url", false],
  ["sortOrder", "排序（数字越小越靠前）", "number", false],
];

function vpsFormHtml(v) {
  const val = (k) => (v ? v[k] ?? "" : "");
  return `<form id="vpsForm" class="stacked">
    ${VPS_FIELDS.map(([key, label, type]) => {
      if (type === "textarea") {
        return `<label>${esc(label)}<textarea name="${key}" rows="3">${esc(val(key))}</textarea></label>`;
      }
      return `<label>${esc(label)}<input name="${key}" type="${type}" value="${esc(val(key))}"></label>`;
    }).join("")}
    <div class="row">
      <label><input name="recommended" type="checkbox" ${v && v.recommended ? "checked" : ""}> 推荐</label>
      <label><input name="offline" type="checkbox" ${v && v.offline ? "checked" : ""}> 下架</label>
    </div>
    <div>
      <button type="submit">${v ? "保存修改" : "创建 VPS"}</button>
      <button type="button" class="secondary" id="cancelVpsForm">取消</button>
    </div>
  </form>`;
}

function renderVps() {
  const tbody = $("#vpsTable tbody");
  tbody.innerHTML = vpsList.map((v) => `<tr>
    <td><strong>${esc(v.name)}</strong>${v.recommended ? " ★" : ""}</td>
    <td>${esc(v.price || "—")}</td>
    <td>${esc(TIER_LABEL[v.tier] || v.tier || "—")}</td>
    <td>${v.sortOrder ?? 0}</td>
    <td>${v.offline ? "下架" : "上架"}</td>
    <td>
      <button class="secondary" data-edit-vps="${esc(v.id)}">编辑</button>
      <button class="danger" data-del-vps="${esc(v.id)}">删除</button>
    </td>
  </tr>`).join("");
  tbody.querySelectorAll("[data-edit-vps]").forEach((b) =>
    b.addEventListener("click", () => openVpsForm(vpsList.find((x) => x.id === b.dataset.editVps))));
  tbody.querySelectorAll("[data-del-vps]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("确定删除这个 VPS 吗？")) return;
      try {
        await api("/api/admin/vps/" + encodeURIComponent(b.dataset.delVps), { method: "DELETE" });
        showMsg("已删除。");
        await loadVps();
      } catch (err) { showMsg(err.message, true); }
    }));
}

function openVpsForm(v) {
  const wrap = $("#vpsFormWrap");
  wrap.innerHTML = vpsFormHtml(v || null);
  const form = $("#vpsForm");
  $("#cancelVpsForm").addEventListener("click", () => { wrap.innerHTML = ""; });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {};
    for (const [key] of VPS_FIELDS) body[key] = fd.get(key) ?? "";
    if (body.sortOrder !== "") body.sortOrder = Number(body.sortOrder);
    body.recommended = fd.get("recommended") === "on";
    body.offline = fd.get("offline") === "on";
    try {
      if (v) {
        await api("/api/admin/vps/" + encodeURIComponent(v.id), { method: "PUT", body });
        showMsg("已保存。");
      } else {
        await api("/api/admin/vps", { method: "POST", body });
        showMsg("已创建。");
      }
      wrap.innerHTML = "";
      await loadVps();
    } catch (err) { showMsg(err.message, true); }
  });
  form.scrollIntoView({ behavior: "smooth" });
}

$("#newVpsBtn").addEventListener("click", () => openVpsForm(null));

async function loadVps() {
  const data = await api("/api/admin/vps");
  vpsList = data.vps || [];
  renderVps();
}

// ---------- settings ----------
$("#settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/api/admin/settings", {
      method: "PUT",
      body: { siteName: $("#siteNameInput").value },
    });
    showMsg("站名已保存，前台下次请求即生效。");
  } catch (err) { showMsg(err.message, true); }
});

// ---------- manual star refresh ----------
$("#refreshStarsBtn").addEventListener("click", async () => {
  const btn = $("#refreshStarsBtn");
  btn.disabled = true;
  showMsg("正在刷新 Star…");
  try {
    const data = await api("/api/admin/refresh-stars", { method: "POST" });
    showMsg(`刷新完成：${data.date}，${data.updated}/${data.total} 个仓库已更新` +
      (data.failed && data.failed.length ? `，失败 ${data.failed.length} 个。` : "。"));
    await loadApps();
  } catch (err) {
    showMsg(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

// ---------- boot ----------
async function loadAll() {
  try {
    await loadApps();
    await loadAirports();
    await loadVps();
    const { settings } = await api("/api/admin/settings");
    $("#siteNameInput").value = settings.siteName || "";
    $("#siteName").textContent = settings.siteName || "代理客户端大全";
  } catch (err) {
    if (err.status === 401) showLogin();
    else showMsg(err.message, true);
  }
}

if (getToken()) {
  showAdmin();
  loadAll();
}
