#!/bin/sh
set -eu

DATA_MODE="${MINIAPP_DATA_MODE:-api}"
API_BASE_URL="${MINIAPP_API_BASE_URL:-http://localhost:8000/api/v1}"

cat > /usr/share/nginx/html/runtime-config.js <<EOF
globalThis.__COMMUNITY_STORE_RUNTIME__ = {
  dataMode: "${DATA_MODE}",
  apiBaseUrl: "${API_BASE_URL}",
};
EOF

exec nginx -g 'daemon off;'
