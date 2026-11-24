// GET /api/sitedata — everything the public frontend needs in one call:
// site name, published apps, airports that are not offline, and VPS
// providers that are not offline.
// The airports and VPS sections are hidden on the frontend when their lists are empty.
import { loadSettings, loadApps, loadAirports, loadVps, jsonResponse } from "../_lib/store.js";

export async function onRequestGet({ env }) {
  const [settings, apps, airports, vps] = await Promise.all([
    loadSettings(env),
    loadApps(env),
    loadAirports(env),
    loadVps(env),
  ]);
  return jsonResponse({
    ok: true,
    siteName: settings.siteName,
    apps: apps.filter((a) => a.published !== false),
    airports: airports
      .filter((a) => !a.offline)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    vps: vps
      .filter((v) => !v.offline)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  });
}
