// POST /api/cron/refresh-stars — called by the cron Worker once a day.
// Protected by the CRON_SECRET secret (header: x-cron-auth). Fails closed
// when the secret is not configured, and rejects wrong secrets with 401.
// Uses the same refresh code as the admin manual refresh.
import { refreshStars } from "../../_lib/refreshStars.js";
import { jsonResponse, errorResponse } from "../../_lib/store.js";

export async function onRequestPost({ request, env }) {
  if (!env.CRON_SECRET) {
    return errorResponse("CRON_SECRET 未配置", 500);
  }
  if (request.headers.get("x-cron-auth") !== env.CRON_SECRET) {
    return errorResponse("未授权", 401);
  }
  const result = await refreshStars(env);
  return jsonResponse(result);
}
