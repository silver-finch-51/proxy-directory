// Build the KV seed files from the exported artifact data.
// Usage: node scripts/build-seed.mjs
// Input : ../data/artifact-site-export-2026-11-24.json (17 apps, airports: [])
// Output: seed/settings.json, seed/apps.json, seed/airports.json,
//         seed/star_history.json  (one snapshot dated by starsObservedAt)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dataPath = path.resolve(
  root,
  "../data/artifact-site-export-2026-11-24.json",
);

const exported = JSON.parse(readFileSync(dataPath, "utf8"));

const settings = { siteName: exported.siteName || "代理客户端大全" };
const apps = exported.apps || [];
const airports = exported.airports || [];

// Star history seed: a single snapshot on the day the export was taken.
// Until daily snapshots accumulate, 7d/30d deltas keep the exported values
// (see functions/_lib/refreshStars.js).
const snapshotDate =
  (apps.find((a) => a.starsObservedAt) || {}).starsObservedAt || "2026-11-24";
const snapshot = {};
for (const app of apps) {
  if (app.githubRepo && typeof app.stars === "number") {
    snapshot[app.slug] = app.stars;
  }
}
const starHistory = { [snapshotDate]: snapshot };

mkdirSync(path.join(root, "seed"), { recursive: true });
writeFileSync(path.join(root, "seed", "settings.json"), JSON.stringify(settings, null, 2) + "\n");
writeFileSync(path.join(root, "seed", "apps.json"), JSON.stringify(apps, null, 2) + "\n");
writeFileSync(path.join(root, "seed", "airports.json"), JSON.stringify(airports, null, 2) + "\n");
writeFileSync(path.join(root, "seed", "star_history.json"), JSON.stringify(starHistory, null, 2) + "\n");

console.log(`seed written: ${apps.length} apps, ${airports.length} airports, ` +
  `star snapshot ${snapshotDate} (${Object.keys(snapshot).length} repos)`);
