// Header login state: shows "登录 / 注册" when logged out,
// username + logout when logged in. Included on index and detail pages.

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function initHeaderAuth() {
  const el = document.getElementById("headerAuth");
  if (!el) return;
  let me = null;
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    me = await res.json().catch(() => null);
  } catch { /* offline: fall through to the logged-out link */ }
  if (me && me.loggedIn) {
    el.innerHTML = `<span class="who">${esc(me.username)}</span>` +
      `<button type="button" class="linklike" id="headerLogout">退出</button>`;
    document.getElementById("headerLogout").addEventListener("click", async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      location.reload();
    });
  } else {
    el.innerHTML = `<a href="/my.html">登录 / 注册</a>`;
  }
}

document.addEventListener("DOMContentLoaded", initHeaderAuth);
