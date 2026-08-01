#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8787}"

echo "=== Women's Health Navigator — Daytona Sandbox Setup ==="

# Node.js is pre-installed in the Daytona sandbox
echo "Node.js: $(node --version)"

# Install backend dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/../backend"

echo "Installing backend dependencies..."
cd "${BACKEND_DIR}"
npm install --omit=dev

# Write .env from example if not present (CEREBRAS_API_KEY injected via env var)
if [[ ! -f .env ]]; then
  cp .env.example .env
fi

# Patch PORT in .env
sed -i "s/^PORT=.*/PORT=${PORT}/" .env

# Start backend in background
echo "Starting backend on port ${PORT}..."
PORT="${PORT}" \
CEREBRAS_API_KEY="${CEREBRAS_API_KEY:-}" \
CEREBRAS_MODEL="${CEREBRAS_MODEL:-gemma-4-31b}" \
npm start &>/tmp/backend.log &

sleep 3

# Health check
echo "Running health check..."
for i in {1..10}; do
  if curl -sf "http://localhost:${PORT}/api/health" | grep -q '"ok":true'; then
    echo "=== Backend healthy — ready on port ${PORT} ==="
    curl -s "http://localhost:${PORT}/api/health" | python3 -m json.tool || true
    exit 0
  fi
  echo "Waiting for backend... (attempt ${i}/10)"
  sleep 3
done

echo "ERROR: Backend did not become healthy in time."
cat /tmp/backend.log || true
exit 1
