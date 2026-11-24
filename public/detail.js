// App detail page: /app.html?slug=<slug>

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

async function init() {
  const slug = new URLSearchParams(location.search).get("slug");
  const box = $("#detail");
  if (!slug) {
    box.innerHTML = '<p class="error">缺少应用 slug。</p>';
    return;
  }
  const res = await fetch("/api/apps/" + encodeURIComponent(slug));
  if (!res.ok) {
    box.innerHTML = '<p class="error">应用不存在或已下架。</p>';
    return;
  }
  const { app } = await res.json();
  document.title = `${app.name} · 代理客户端大全`;
  const rows = [
    ["平台", (app.platforms || []).join(" / ") || "—"],
    ["内核", (app.cores || []).join(" / ") || app.core || "—"],
    ["开源", app.openSource ? "是" : "否"],
    ["源码", app.sourceStatus || "—"],
    ["费用", app.priceStatus === "paid"
      ? (app.priceUsd !== null && app.priceUsd !== undefined ? "$" + app.priceUsd : "付费")
      : "免费"],
    ["最新版本", app.latestVersion || "—"],
    ["最近更新", app.lastUpdated || "—"],
    ["GitHub Star", app.stars !== null && app.stars !== undefined
      ? fmtNum(app.stars) +
        (app.stars7d !== null && app.stars7d !== undefined ? `（7日 ${fmtDelta(app.stars7d)}` : "") +
        (app.stars30d !== null && app.stars30d !== undefined ? `，30日 ${fmtDelta(app.stars30d)}` : "") +
        (app.stars7d !== null && app.stars7d !== undefined ? "）" : "")
      : "—"],
    ["App Store 评分", app.appStoreRatingCount
      ? fmtNum(app.appStoreRatingCount) +
        (app.appStoreChange7d !== null && app.appStoreChange7d !== undefined
          ? `（近7日 ${fmtDelta(app.appStoreChange7d)}）` : "")
      : "—"],
    ["Google Play 评分", app.googlePlayRatingCount
      ? fmtNum(app.googlePlayRatingCount) +
        (app.googlePlayChange7d !== null && app.googlePlayChange7d !== undefined
          ? `（近7日 ${fmtDelta(app.googlePlayChange7d)}）` : "")
      : "—"],
  ];
  box.innerHTML = `<article class="detail">
    ${app.iconUrl ? `<img class="detail-icon" src="${esc(app.iconUrl)}" alt="" onerror="this.remove()">` : ""}
    <h1>${esc(app.name)}${app.alias ? ` <span class="alias" style="color:#888;font-size:15px;">${esc(app.alias)}</span>` : ""}</h1>
    ${app.tag ? `<p><span class="tag" style="display:inline-block;background:#eef3ff;color:#0b5fff;font-size:12px;border-radius:4px;padding:1px 8px;">${esc(app.tag)}</span></p>` : ""}
    <p>${esc(app.description || "")}</p>
    ${app.note ? `<p class="note">${esc(app.note)}</p>` : ""}
    <div class="actions">
      ${app.downloadUrl ? `<a href="${esc(app.downloadUrl)}" target="_blank" rel="noopener">${esc(app.downloadLabel || "下载")}</a>` : ""}
      ${app.officialUrl ? `<a class="secondary" href="${esc(app.officialUrl)}" target="_blank" rel="noopener">官网</a>` : ""}
      ${app.githubRepo ? `<a class="secondary" href="https://github.com/${esc(app.githubRepo)}" target="_blank" rel="noopener">GitHub 仓库</a>` : ""}
    </div>
    <dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
    <p class="muted">下载链接为官方地址；价格以官网为准。</p>
  </article>`;
}

init().catch((err) => {
  $("#detail").innerHTML = `<p class="error">加载失败：${esc(err.message)}</p>`;
});
