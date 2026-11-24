// GET /api/sitedata — everything the public frontend needs in one call:
// site name, published apps, and airports that are not offline.
// The airports section is hidden on the frontend when this list is empty.
import { loadSettings, loadApps, loadAirports, jsonResponse } from "../_lib/store.js";

export async function onRequestGet({ env }) {
  const [settings, apps, airports] = await Promise.all([
    loadSettings(env),
    loadApps(env),
    loadAirports(env),
  ]);
  return jsonResponse({
    ok: true,
    siteName: settings.siteName,
    apps: apps.filter((a) => a.published !== false),
    airports: airports
      .filter((a) => !a.offline)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  });
}
