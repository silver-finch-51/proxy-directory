// POST /api/admin/refresh-stars — manual star refresh from the admin panel.
// Shares the exact same code as the daily cron refresh (see _lib/refreshStars.js).
import { refreshStars } from "../../_lib/refreshStars.js";
import { jsonResponse } from "../../_lib/store.js";

export async function onRequestPost({ env }) {
  const result = await refreshStars(env);
  return jsonResponse(result);
}
