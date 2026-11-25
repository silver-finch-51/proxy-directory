// Login / register page: POSTs to /api/auth/*, redirects home on success.

const $ = (s, el = document) => el.querySelector(s);

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

let mode = "login";

function setMode(next) {
  mode = next;
  $("#tabLogin").classList.toggle("active", mode === "login");
  $("#tabRegister").classList.toggle("active", mode === "register");
  $("#authTitle").textContent = mode === "login" ? "登录" : "注册";
  $("#authSubmit").textContent = mode === "login" ? "登录" : "注册";
  $("#authHint").textContent = mode === "login"
    ? "登录已有账号。"
    : "用户名 2–20 个字符，不能与他人重复；密码至少 6 位。";
  $("#authErr").hidden = true;
}

$("#tabLogin").addEventListener("click", () => setMode("login"));
$("#tabRegister").addEventListener("click", () => setMode("register"));

$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const errEl = $("#authErr");
  errEl.hidden = true;
  const btn = $("#authSubmit");
  btn.disabled = true;
  try {
    const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: fd.get("username"), password: fd.get("password") }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`);
    location.href = "/";
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
  }
});

$("#authLogout").addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  location.reload();
});

(async () => {
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    const me = await res.json().catch(() => ({}));
    if (me.loggedIn) {
      $("#authForm").hidden = true;
      document.querySelector(".auth-tabs").hidden = true;
      $("#authTitle").textContent = "已登录";
      $("#authedName").textContent = me.username;
      $("#authedBox").hidden = false;
    }
  } catch { /* not logged in; show the form */ }
})();
