// Admin password check against the ADMIN_PASSWORD Workers Secret.
// ADMIN_PASSWORD is set in the Cloudflare dashboard or via
// `wrangler pages secret put ADMIN_PASSWORD`. It never appears in code, and
// login fails closed when it is not configured.
// Sessions are KV-backed (see _lib/session.js); this file only verifies the
// admin password.

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
