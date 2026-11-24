// Public index page: app directory with search / filters / sorting,
// plus the airports section (hidden when there are no airports).

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

function storeLine(app) {
  const parts = [];
  if (app.appStoreRatingCount) {
    parts.push(
      "App Store 评分 " + fmtNum(app.appStoreRatingCount) +
      (app.appStoreChange7d !== null && app.appStoreChange7d !== undefined
        ? " · 近7日 " + fmtDelta(app.appStoreChange7d)
        : ""),
    );
  }
  if (app.googlePlayRatingCount) {
    parts.push(
      "Google Play 评分 " + fmtNum(app.googlePlayRatingCount) +
      (app.googlePlayChange7d !== null && app.googlePlayChange7d !== undefined
        ? " · 近7日 " + fmtDelta(app.googlePlayChange7d)
        : ""),
    );
  }
  return parts.join("；");
}

function cardHtml(app) {
  const starLine = app.stars !== null && app.stars !== undefined
    ? "★ " + fmtNum(app.stars) +
      (app.stars7d !== null && app.stars7d !== undefined
        ? ' <span class="delta">7日 ' + fmtDelta(app.stars7d) + "</span>"
        : "") +
      (app.stars30d !== null && app.stars30d !== undefined
        ? ' <span class="delta">30日 ' + fmtDelta(app.stars30d) +
          (app.stars30dPct !== null && app.stars30dPct !== undefined
            ? " (" + (app.stars30dPct >= 0 ? "+" : "") + app.stars30dPct.toFixed(1) + "%)"
            : "") + "</span>"
        : "")
    : "";
  const stores = storeLine(app);
  return `<article class="card">
    <h3><a href="/app.html?slug=${esc(app.slug)}">${esc(app.name)}</a>` +
    (app.alias ? ` <span class="alias">${esc(app.alias)}</span>` : "") + `</h3>` +
    (app.tag ? `<p class="tag">${esc(app.tag)}</p>` : "") +
    `<p class="desc">${esc(app.description || "")}</p>` +
    (starLine ? `<p class="stars">${starLine}</p>` : "") +
    (stores ? `<p class="stores">${esc(stores)}</p>` : "") +
    `<p class="meta">${app.latestVersion ? "版本 " + esc(app.latestVersion) + " · " : ""}${esc(priceLabel(app))} · ${esc((app.platforms || []).join(" / "))}</p>` +
    `<div class="chips">${(app.platforms || []).map((p) => `<span class="chip">${esc(p)}</span>`).join("")}</div>
  </article>`;
}

let allApps = [];

function currentFilters() {
  return {
    q: $("#q").value.trim().toLowerCase(),
    platform: $("#fPlatform").value,
    core: $("#fCore").value,
    price: $("#fPrice").value,
    open: $("#fOpen").value,
    sort: $("#fSort").value,
  };
}

function applyFilters() {
  const f = currentFilters();
  let list = allApps.filter((app) => {
    if (f.q) {
      const hay = [app.name, app.alias, app.description, app.tag]
        .filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    if (f.platform && !(app.platforms || []).includes(f.platform)) return false;
    if (f.core && !((app.cores || []).includes(f.core) || app.core === f.core)) return false;
    if (f.price && app.priceStatus !== f.price) return false;
    if (f.open === "open" && !app.openSource) return false;
    if (f.open === "closed" && app.openSource) return false;
    return true;
  });

  const byStarsDesc = (a, b) => (b.stars ?? -1) - (a.stars ?? -1);
  if (f.sort === "stars") list = [...list].sort(byStarsDesc);
  else if (f.sort === "hot7d") list = [...list].sort((a, b) => (b.stars7d ?? -1) - (a.stars7d ?? -1));
  else if (f.sort === "updated") list = [...list].sort((a, b) => String(b.lastUpdated || "").localeCompare(String(a.lastUpdated || "")));
  // "default": keep the seed order (by id).

  $("#appGrid").innerHTML = list.map(cardHtml).join("");
  $("#emptyMsg").hidden = list.length > 0;
  $("#resultCount").textContent = `共 ${list.length} 个应用`;
}

function fillFilterOptions() {
  const platforms = [...new Set(allApps.flatMap((a) => a.platforms || []))].sort();
  const cores = [...new Set(allApps.flatMap((a) => a.cores || []))].sort();
  for (const p of platforms) {
    $("#fPlatform").insertAdjacentHTML("beforeend", `<option>${esc(p)}</option>`);
  }
  for (const c of cores) {
    $("#fCore").insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`);
  }
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
    <h3>${a.officialUrl
      ? `<a href="${esc(a.officialUrl)}" target="_blank" rel="noopener">${esc(a.name)}</a>`
      : esc(a.name)}${a.recommended ? '<span class="badge">推荐</span>' : ""}</h3>
    ${a.price ? `<p>价格：${esc(a.price)}</p>` : ""}
    ${a.traffic ? `<p>流量：${esc(a.traffic)}</p>` : ""}
    ${a.nodes ? `<p>节点：${esc(a.nodes)}</p>` : ""}
    ${a.notes ? `<p>${esc(a.notes)}</p>` : ""}
  </article>`).join("");
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
  fillFilterOptions();
  applyFilters();
  renderAirports(data.airports || []);
  for (const id of ["q", "fPlatform", "fCore", "fPrice", "fOpen", "fSort"]) {
    $("#" + id).addEventListener("input", applyFilters);
    $("#" + id).addEventListener("change", applyFilters);
  }
}

init().catch((err) => {
  $("#appGrid").innerHTML = `<p class="error">加载失败：${esc(err.message)}</p>`;
});
