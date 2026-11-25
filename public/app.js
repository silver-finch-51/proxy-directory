// Public index page: app directory with search / chip filters / sorting,
// plus the airports section (hidden when there are no airports) and VPS.

const $ = (s, el = document) => el.querySelector(s);

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function fmtNum(n) {
  return n === null || n === undefined ? "—" : Number(n).toLocaleString("en-US");
}

function fmtDelta(n) {
  if (n === null || n === undefined) return "";
  return (n >= 0 ? "+" : "") + Number(n).toLocaleString("en-US");
}

function priceLabel(app) {
  if (app.priceStatus === "paid") {
    return app.priceUsd !== null && app.priceUsd !== undefined
      ? "$" + app.priceUsd
      : "付费";
  }
  return "免费";
}

function ratingTotal(app) {
  return (app.appStoreRatingCount || 0) + (app.googlePlayRatingCount || 0);
}

function ratingChange7d(app) {
  if (app.appStoreChange7d !== null && app.appStoreChange7d !== undefined) return app.appStoreChange7d;
  if (app.googlePlayChange7d !== null && app.googlePlayChange7d !== undefined) return app.googlePlayChange7d;
  return null;
}

function statsLine(app) {
  const parts = [];
  if (app.stars !== null && app.stars !== undefined) {
    if (app.stars7d !== null && app.stars7d !== undefined) parts.push("7日 " + fmtDelta(app.stars7d));
    if (app.stars30dPct !== null && app.stars30dPct !== undefined) {
      parts.push("30日 " + (app.stars30dPct >= 0 ? "+" : "") + app.stars30dPct.toFixed(1) + "%");
    }
    parts.push("Star " + fmtNum(app.stars));
  }
  const total = ratingTotal(app);
  if (total > 0) {
    let r = "评分数 " + fmtNum(total);
    const ch = ratingChange7d(app);
    if (ch !== null) r += " · 7日变化 " + fmtDelta(ch);
    parts.push(r);
  }
  return parts.join(" · ");
}

function cardHtml(app) {
  const chips = [];
  if (app.tag) chips.push(`<span class="chip">${esc(app.tag)}</span>`);
  const platforms = app.platforms || [];
  platforms.slice(0, 3).forEach((p) => chips.push(`<span class="chip">${esc(p)}</span>`));
  if (platforms.length > 3) chips.push(`<span class="chip">+${platforms.length - 3}</span>`);
  const stats = statsLine(app);
  return `<article class="card">
    ${app.iconUrl ? `<img class="card-icon" src="${esc(app.iconUrl)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
    <div class="card-body">
    <h3><a href="/app.html?slug=${esc(app.slug)}">${esc(app.name)}</a>` +
    (app.alias ? ` <span class="alias">${esc(app.alias)}</span>` : "") + `</h3>` +
    (chips.length ? `<div class="chips">${chips.join("")}</div>` : "") +
    `<p class="desc">${esc(app.description || "")}</p>` +
    (stats ? `<p class="stats">${esc(stats)}</p>` : "") +
    `</div>
    <div class="card-side">
      ${app.downloadUrl ? `<a class="dl-btn" href="${esc(app.downloadUrl)}" target="_blank" rel="noopener">${esc(app.downloadLabel || "下载")}</a>` : ""}
      <span class="price">${app.priceStatus === "paid" ? esc(priceLabel(app)) : "全功能免费"}</span>
    </div>
  </article>`;
}

let allApps = [];
let allVps = [];
const filters = { q: "", platform: "", price: "", sort: "default" };
let vpsTier = "";
let vpsSort = "default";

// 平台快捷 chips：苹果 = iOS/macOS/tvOS，安卓 = Android，其余按单个平台匹配。
const PLATFORM_GROUPS = {
  apple: ["iOS", "macOS", "tvOS"],
  android: ["Android"],
};

function matchPlatform(app, key) {
  if (!key) return true;
  const platforms = app.platforms || [];
  if (PLATFORM_GROUPS[key]) return platforms.some((p) => PLATFORM_GROUPS[key].includes(p));
  return platforms.includes(key);
}

const FILTER_DEFS = {
  price: { label: "价格", allLabel: "全部", options: () => ["free", "paid"], labels: { free: "免费", paid: "付费" } },
};

function closeAllPanels(except) {
  document.querySelectorAll(".chip-filter").forEach((wrap) => {
    if (wrap === except) return;
    wrap.querySelector(".chip-panel").hidden = true;
    wrap.querySelector(".chip-btn").setAttribute("aria-expanded", "false");
  });
}

function buildFilterPanels() {
  document.querySelectorAll(".chip-filter").forEach((wrap) => {
    const key = wrap.dataset.filter;
    const def = FILTER_DEFS[key];
    const panel = wrap.querySelector(".chip-panel");
    const btn = wrap.querySelector(".chip-btn");
    const values = def.options();
    const opts = [{ value: "", label: def.allLabel }]
      .concat(values.map((v) => ({ value: v, label: (def.labels && def.labels[v]) || v })));
    panel.innerHTML = opts.map((o) =>
      `<button type="button" data-value="${esc(o.value)}"${o.value === filters[key] ? ' class="selected"' : ""}>${esc(o.label)}</button>`
    ).join("");
    panel.addEventListener("click", (ev) => {
      const opt = ev.target.closest("button[data-value]");
      if (!opt) return;
      filters[key] = opt.dataset.value;
      btn.querySelector(".chip-label").textContent =
        opt.dataset.value === "" ? def.label : opt.textContent;
      btn.classList.toggle("selected", opt.dataset.value !== "");
      closeAllPanels();
      applyFilters();
    });
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const willOpen = panel.hidden;
      closeAllPanels(wrap);
      panel.hidden = !willOpen;
      btn.setAttribute("aria-expanded", String(willOpen));
    });
  });
  document.addEventListener("click", (ev) => {
    if (!ev.target.closest(".chip-filter")) closeAllPanels();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeAllPanels();
  });
}

function applyFilters() {
  let list = allApps.filter((app) => {
    if (filters.q) {
      const hay = [app.name, app.alias, app.description, app.tag]
        .filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(filters.q)) return false;
    }
    if (filters.platform && !matchPlatform(app, filters.platform)) return false;
    if (filters.price && app.priceStatus !== filters.price) return false;
    return true;
  });

  if (filters.sort === "hot7d") list = [...list].sort((a, b) => (b.stars7d ?? -1) - (a.stars7d ?? -1));
  else if (filters.sort === "updated") list = [...list].sort((a, b) => String(b.lastUpdated || "").localeCompare(String(a.lastUpdated || "")));
  else if (filters.sort === "ratings") list = [...list].sort((a, b) => ratingTotal(b) - ratingTotal(a));
  // "default": keep the seed order.

  $("#appGrid").innerHTML = list.map(cardHtml).join("");
  $("#emptyMsg").hidden = list.length > 0;
  $("#resultCount").innerHTML = `共 <b>${list.length}</b> 个应用`;
}

function renderAirports(airports) {
  const section = $("#airports");
  const nav = $("#navAirports");
  if (!airports || airports.length === 0) {
    section.hidden = true;
    nav.hidden = true;
    return;
  }
  section.hidden = false;
  nav.hidden = false;
  $("#airportList").innerHTML = airports.map((a) => `<article class="airport">
    ${a.iconUrl ? `<img class="airport-icon" src="${esc(a.iconUrl)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
    <h3>${a.officialUrl
      ? `<a href="${esc(a.officialUrl)}" target="_blank" rel="noopener">${esc(a.name)}</a>`
      : esc(a.name)}${a.recommended ? '<span class="badge">推荐</span>' : ""}</h3>
    ${a.price ? `<p>价格：${esc(a.price)}</p>` : ""}
    ${a.traffic ? `<p>流量：${esc(a.traffic)}</p>` : ""}
    ${a.nodes ? `<p>节点：${esc(a.nodes)}</p>` : ""}
    ${a.notes ? `<p>${esc(a.notes)}</p>` : ""}
  </article>`).join("");
}

const TIER_LABEL = { cheap: "便宜", mid: "中等", premium: "高端" };

// " $21.99/年起 " -> ~1.83 USD/month; "$5/月起" -> 5. Currency symbol ignored.
function monthlyPrice(v) {
  if (!v || !v.price) return null;
  const m = String(v.price).match(/([\d.]+)/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (/年/.test(v.price)) n = n / 12;
  return n;
}

function renderVps() {
  const section = $("#vps");
  const nav = $("#navVps");
  if (!allVps || allVps.length === 0) {
    section.hidden = true;
    nav.hidden = true;
    return;
  }
  section.hidden = false;
  nav.hidden = false;
  let list = allVps.filter((v) => !vpsTier || v.tier === vpsTier);
  if (vpsSort === "price") {
    list = [...list].sort((a, b) => {
      const pa = monthlyPrice(a), pb = monthlyPrice(b);
      if (pa === null && pb === null) return 0;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return pa - pb;
    });
  }
  $("#vpsList").innerHTML = list.map((v) => `<article class="vps">
    ${v.iconUrl ? `<div class="vps-logo"><img src="${esc(v.iconUrl)}" alt="" loading="lazy" onerror="this.closest('.vps-logo').remove()"></div>` : ""}
    <div class="vps-body">
    <h3>${v.officialUrl
      ? `<a href="${esc(v.officialUrl)}" target="_blank" rel="noopener">${esc(v.name)}</a>`
      : esc(v.name)}${v.recommended ? '<span class="badge">推荐</span>' : ""}${v.tier ? `<span class="tier tier-${esc(v.tier)}">${esc(TIER_LABEL[v.tier] || v.tier)}</span>` : ""}</h3>
    <p class="vps-specs">${[v.cpu, v.memory, v.disk, v.bandwidth].filter(Boolean).join(" / ") || "配置以官网为准"}</p>
    ${v.locations ? `<p>机房：${esc(v.locations)}</p>` : ""}
    ${v.notes ? `<p class="muted">${esc(v.notes)}</p>` : ""}
    </div>
    <div class="vps-side">
      ${v.officialUrl ? `<a class="dl-btn" href="${esc(v.officialUrl)}" target="_blank" rel="noopener">官网</a>` : ""}
      <span class="price">${esc(v.price || "")}</span>
    </div>
  </article>`).join("");
}

function bindVpsControls() {
  document.querySelectorAll("[data-tier]").forEach((btn) => {
    btn.addEventListener("click", () => {
      vpsTier = btn.dataset.tier;
      document.querySelectorAll("[data-tier]").forEach((b) => b.classList.toggle("active", b === btn));
      renderVps();
    });
  });
  document.querySelectorAll("[data-vps-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      vpsSort = btn.dataset.vpsSort;
      document.querySelectorAll("[data-vps-sort]").forEach((b) => b.classList.toggle("active", b === btn));
      renderVps();
    });
  });
}

function bindQuickChips() {
  document.querySelectorAll(".quick-chip[data-platform]").forEach((btn) => {
    btn.addEventListener("click", () => {
      filters.platform = btn.dataset.platform;
      document.querySelectorAll(".quick-chip[data-platform]").forEach((b) => b.classList.toggle("active", b === btn));
      applyFilters();
    });
  });
}

function bindSortSeg() {
  document.querySelectorAll(".seg button[data-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      filters.sort = btn.dataset.sort;
      document.querySelectorAll(".seg button[data-sort]").forEach((b) => b.classList.toggle("active", b === btn));
      applyFilters();
    });
  });
}

function bindBottomNav() {
  document.querySelectorAll(".bottom-nav a").forEach((a) => {
    a.addEventListener("click", () => {
      document.querySelectorAll(".bottom-nav a").forEach((x) => x.removeAttribute("aria-current"));
      a.setAttribute("aria-current", "page");
    });
  });
}

async function init() {
  const res = await fetch("/api/sitedata");
  if (!res.ok) {
    $("#appGrid").innerHTML = `<p class="error">加载失败（${res.status}），请稍后刷新重试。</p>`;
    return;
  }
  const data = await res.json();
  document.title = data.siteName || "代理客户端大全";
  $("#siteName").textContent = data.siteName || "代理客户端大全";
  allApps = data.apps || [];
  allVps = data.vps || [];
  buildFilterPanels();
  bindQuickChips();
  bindSortSeg();
  bindVpsControls();
  bindBottomNav();
  applyFilters();
  renderAirports(data.airports || []);
  renderVps();
  $("#q").addEventListener("input", () => {
    filters.q = $("#q").value.trim().toLowerCase();
    applyFilters();
  });
}

init().catch((err) => {
  $("#appGrid").innerHTML = `<p class="error">加载失败：${esc(err.message)}</p>`;
});
