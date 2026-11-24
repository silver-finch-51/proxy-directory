// Shared star-refresh logic. Used by BOTH:
//   - POST /api/cron/refresh-stars   (called by the cron Worker every day)
//   - POST /api/admin/refresh-stars  (manual refresh from the admin panel)
// There is exactly one implementation so the two paths can never drift apart.

import { loadApps, saveApps, loadHistory, saveHistory } from "./store.js";

const GITHUB_API = "https://api.github.com/repos/";

function todayUTC(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dateMinusDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// Nearest snapshot dated on or before `target` (snapshots are keyed by ISO date).
function snapshotOnOrBefore(history, target) {
  const dates = Object.keys(history).filter((d) => d <= target).sort();
  return dates.length ? history[dates[dates.length - 1]] : null;
}

async function fetchRepoStars(repo) {
  const res = await fetch(GITHUB_API + repo, {
    headers: {
      Accept: "application/vnd.github+json",
      // GitHub API requires a User-Agent header.
      "User-Agent": "proxy-directory-star-refresh",
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${repo}`);
  const data = await res.json();
  if (typeof data.stargazers_count !== "number") {
    throw new Error(`no stargazers_count for ${repo}`);
  }
  return data.stargazers_count;
}

export async function refreshStars(env, now = new Date()) {
  const today = todayUTC(now);
  const apps = await loadApps(env);
  const history = await loadHistory(env);
  const withRepo = apps.filter((a) => a.githubRepo);

  // 12 repos, unauthenticated GitHub API limit is 60 requests/hour — plenty.
  const results = await Promise.allSettled(
    withRepo.map(async (app) => ({
      slug: app.slug,
      stars: await fetchRepoStars(app.githubRepo),
    })),
  );

  const fetched = {};
  const failed = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      fetched[r.value.slug] = r.value.stars;
    } else {
      failed.push(String(r.reason && r.reason.message ? r.reason.message : r.reason));
    }
  }

  // Record today's snapshot (only repos fetched successfully).
  history[today] = { ...(history[today] || {}), ...fetched };

  // Recompute 7d/30d deltas from snapshots. A delta is only recomputed when a
  // snapshot exists at least 7/30 days old; otherwise the seeded value stays.
  // The seed contains a single snapshot (2026-11-24), so recomputing earlier
  // would produce "since launch" numbers instead of true 7d/30d deltas.
  const snap7 = snapshotOnOrBefore(history, dateMinusDays(today, 7));
  const snap30 = snapshotOnOrBefore(history, dateMinusDays(today, 30));

  let updated = 0;
  for (const app of apps) {
    if (!(app.slug in fetched)) continue; // fetch failed: keep the old numbers
    const stars = fetched[app.slug];
    app.stars = stars;
    app.starsObservedAt = today;
    if (snap7 && typeof snap7[app.slug] === "number") {
      app.stars7d = stars - snap7[app.slug];
    }
    if (snap30 && typeof snap30[app.slug] === "number") {
      const d30 = stars - snap30[app.slug];
      const base = snap30[app.slug];
      app.stars30d = d30;
      app.stars30dPct = base > 0 ? (d30 / base) * 100 : null;
    }
    updated++;
  }

  await saveApps(env, apps);
  await saveHistory(env, history);
  return { ok: true, date: today, updated, failed, total: withRepo.length };
}
