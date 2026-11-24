// Admin auth: HMAC-signed bearer tokens, keyed by ADMIN_PASSWORD.
// ADMIN_PASSWORD is a Workers Secret (set in the Cloudflare dashboard or via
// `wrangler pages secret put ADMIN_PASSWORD`). It never appears in code, and
// login fails closed when it is not configured.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64urlEncode(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(env) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(env.ADMIN_PASSWORD),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

// Comparison that does not leak the password length through timing.
export async function verifyPassword(env, password) {
  const expected = env.ADMIN_PASSWORD;
  if (!expected || typeof password !== "string") return false;
  let diff = expected.length ^ password.length;
  const n = Math.max(expected.length, password.length);
  for (let i = 0; i < n; i++) {
    diff |= (expected.charCodeAt(i) || 0) ^ (password.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function signToken(env, username) {
  const payload = { u: username, exp: Date.now() + 24 * 60 * 60 * 1000 };
  const payloadB64 = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(env);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  return `${payloadB64}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifyToken(env, token) {
  try {
    if (!token || typeof token !== "string") return null;
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;
    const key = await hmacKey(env);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sigB64),
      encoder.encode(payloadB64),
    );
    if (!ok) return null;
    const payload = JSON.parse(decoder.decode(b64urlDecode(payloadB64)));
    if (!payload || payload.u !== "admin") return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearerToken(request) {
  const h = request.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/.exec(h);
  return m ? m[1] : null;
}
