#!/usr/bin/env bash
# Upload the seed data into the SITE_DATA KV namespace.
# Run AFTER creating the namespace and pasting its id into wrangler.toml:
#   wrangler kv namespace create SITE_DATA
set -euo pipefail
cd "$(dirname "$0")/.."

wrangler kv key put --binding SITE_DATA settings --path seed/settings.json
wrangler kv key put --binding SITE_DATA apps --path seed/apps.json
wrangler kv key put --binding SITE_DATA airports --path seed/airports.json
wrangler kv key put --binding SITE_DATA vps --path seed/vps.json
wrangler kv key put --binding SITE_DATA star_history --path seed/star_history.json

echo "seed done: settings, apps, airports, vps, star_history"
