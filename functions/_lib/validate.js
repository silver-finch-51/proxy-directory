// Shared field validation / normalization for admin CRUD endpoints.

export function toStringOrNull(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function toStringArray(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return v.split(/[,，、]/).map((x) => x.trim()).filter(Boolean);
  return [];
}

export function toBool(v, fallback = false) {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1" || v === 1) return true;
  if (v === "false" || v === "0" || v === 0) return false;
  return fallback;
}

export function toNumberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function isHttpUrl(v) {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Normalize an app record coming from the admin form / API.
// `existing` is the current record when updating (null when creating).
// Star figures and store ratings are never edited by hand — they are
// maintained by the daily refresh — so they are preserved from `existing`
// (or initialized to null on create).
export function normalizeApp(input, existing) {
  const base = existing || {};
  const priceStatus = input.priceStatus === "paid" ? "paid" : "free";
  return {
    id: base.id ?? null,
    slug: toStringOrNull(input.slug) || base.slug,
    name: toStringOrNull(input.name) || base.name || "",
    alias: toStringOrNull(input.alias),
    tag: toStringOrNull(input.tag),
    description: toStringOrNull(input.description) || "",
    note: toStringOrNull(input.note),
    platforms: toStringArray(input.platforms),
    cores: toStringArray(input.cores),
    core: toStringOrNull(input.core) || "未核实",
    openSource: toBool(input.openSource, false),
    sourceStatus: toStringOrNull(input.sourceStatus) || "未公开",
    priceStatus,
    priceUsd: priceStatus === "paid" ? toNumberOrNull(input.priceUsd) : 0,
    pricingLabel: toStringOrNull(input.pricingLabel),
    downloadUrl: toStringOrNull(input.downloadUrl) || "",
    downloadLabel: toStringOrNull(input.downloadLabel) || "下载",
    officialUrl: toStringOrNull(input.officialUrl),
    latestVersion: toStringOrNull(input.latestVersion),
    lastUpdated: toStringOrNull(input.lastUpdated),
    githubRepo: toStringOrNull(input.githubRepo),
    published: toBool(input.published, true),
    // Managed by the star refresh, never by hand:
    stars: base.stars ?? null,
    stars7d: base.stars7d ?? null,
    stars30d: base.stars30d ?? null,
    stars30dPct: base.stars30dPct ?? null,
    starsObservedAt: base.starsObservedAt ?? null,
    appStoreRatingCount: base.appStoreRatingCount ?? null,
    appStoreChange7d: base.appStoreChange7d ?? null,
    googlePlayRatingCount: base.googlePlayRatingCount ?? null,
    googlePlayChange7d: base.googlePlayChange7d ?? null,
  };
}

// Normalize an airport record coming from the admin form / API.
export function normalizeAirport(input, existing) {
  const base = existing || {};
  return {
    id: base.id || null,
    name: toStringOrNull(input.name) || base.name || "",
    officialUrl: toStringOrNull(input.officialUrl),
    price: toStringOrNull(input.price),
    traffic: toStringOrNull(input.traffic),
    nodes: toStringOrNull(input.nodes),
    notes: toStringOrNull(input.notes),
    sortOrder: toNumberOrNull(input.sortOrder) ?? 0,
    recommended: toBool(input.recommended, false),
    offline: toBool(input.offline, false),
  };
}

export function newAirportId() {
  return (
    "apt-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}
