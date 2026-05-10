#!/bin/sh
# Fail if any .tff-cc path reference exists outside the whitelist.
# After the rename, .tff is the canonical directory; .tff-cc is legacy.

set -e

# grep -rn output format is `path:line:content`, so anchoring whitelist entries
# with a trailing `:` prevents substring collisions.
MATCHES=$(grep -rnE '\.tff-cc' \
  --include='*.ts' --include='*.js' --include='*.sh' \
  --include='*.md' --include='*.yaml' --include='*.yml' \
  --include='*.json' \
  src/ hooks/ workflows/ commands/ skills/ references/ tests/ \
  2>/dev/null \
  | grep -v '\.original\.md:' \
  || true)

if [ -n "$MATCHES" ]; then
  echo "Found legacy .tff-cc references outside whitelist:"
  echo "$MATCHES"
  exit 1
fi
exit 0
