// "我的" page: login/register when logged out; account info, password change,
// logout and account deletion when logged in; admin entry for admins.
// Tutorials entry lives in the menu above and works in both states.

const $ = (s, el = document) => el.querySelector(s);

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function postJson(path, body) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`);
  return data;
}

// ---------- login / register ----------
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
    await postJson(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
      username: fd.get("username"),
      password: fd.get("password"),
    });
    location.reload();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
  }
});

// ---------- account view ----------
$("#pwForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const msg = $("#pwMsg");
  msg.hidden = true;
  try {
    await postJson("/api/auth/change-password", {
      currentPassword: fd.get("currentPassword"),
      newPassword: fd.get("newPassword"),
    });
    msg.textContent = "密码已修改，下次登录请用新密码。";
    msg.className = "muted";
    msg.hidden = false;
    e.target.reset();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "error";
    msg.hidden = false;
  }
});

$("#logoutBtn").addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  location.reload();
});

$("#deleteBtn").addEventListener("click", async () => {
  if (!confirm("确定注销账号吗？账号删除后无法恢复。")) return;
  const msg = $("#accMsg");
  try {
    const res = await fetch("/api/auth/account", { method: "DELETE", credentials: "same-origin" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`);
    location.reload();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "error";
    msg.hidden = false;
  }
});

// ---------- boot ----------
(async () => {
  let me = null;
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    me = await res.json().catch(() => null);
  } catch { /* offline: show the login form */ }
  if (me && me.loggedIn) {
    $("#authView").hidden = true;
    $("#accountView").hidden = false;
    $("#accName").textContent = me.username;
    $("#accRole").textContent = me.role === "admin" ? "管理员" : "普通用户";
    $("#accCreated").textContent = me.createdAt
      ? new Date(me.createdAt).toLocaleString("zh-CN")
      : "—";
    if (me.role === "admin") {
      $("#adminEntry").hidden = false;
      $("#pwBox").hidden = true;
      $("#deleteBtn").hidden = true;
    }
  } else {
    $("#authView").hidden = false;
    $("#accountView").hidden = true;
  }
})();
