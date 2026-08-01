#!/usr/bin/env bash
set -euo pipefail

GEMMA_MODEL="${GEMMA_MODEL:-gemma2:2b}"
PORT="${PORT:-8787}"

echo "=== Women's Health Navigator — Daytona Sandbox Setup ==="

# Install Ollama if not present
if ! command -v ollama &>/dev/null; then
  echo "Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
fi

# Install Node.js 20 if not present
if ! command -v node &>/dev/null || [[ "$(node -e 'process.stdout.write(process.versions.node.split(".")[0])')" -lt 20 ]]; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Start Ollama server in background
if ! pgrep -x "ollama" &>/dev/null; then
  echo "Starting Ollama..."
  ollama serve &>/tmp/ollama.log &
  sleep 5
fi

# Pull model
echo "Pulling model: ${GEMMA_MODEL}..."
ollama pull "${GEMMA_MODEL}"

# Install backend dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/../backend"

echo "Installing backend dependencies..."
cd "${BACKEND_DIR}"
npm install

# Write .env if it doesn't exist
if [[ ! -f .env ]]; then
  cp .env.example .env
fi

# Start backend in background
echo "Starting backend on port ${PORT}..."
PORT="${PORT}" npm start &>/tmp/backend.log &
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
echo "Ollama log:"
cat /tmp/ollama.log || true
echo "Backend log:"
cat /tmp/backend.log || true
exit 1
