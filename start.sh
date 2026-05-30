#!/bin/bash
# Revradar — Quick Start

set -e

echo "🔷 Revradar — Starting up"

# ── Stop any existing servers on our ports ───────────────────────────────────
for port in 8000 3000 3001 3002 3003 3004; do
  if lsof -ti :"$port" >/dev/null 2>&1; then
    echo "🛑 Stopping existing process on port $port..."
    lsof -ti :"$port" | xargs kill -9 2>/dev/null || true
  fi
done
pkill -f "next/dist/bin/next dev" 2>/dev/null || true
sleep 1

# ── Copy env ─────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  Created .env from .env.example — fill in your API keys before running!"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

# ── Backend ──────────────────────────────────────────────────────────────────
echo "📦 Installing backend dependencies..."
cd backend

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

python -m pip install -r requirements.txt --upgrade-strategy only-if-needed --quiet || {
  echo "⚠️  pip install failed — recreating virtualenv..."
  deactivate 2>/dev/null || true
  rm -rf .venv
  python3 -m venv .venv
  # shellcheck disable=SC1091
  source .venv/bin/activate
  python -m pip install -r requirements.txt --upgrade-strategy only-if-needed
}

echo "🚀 Starting FastAPI backend on http://localhost:8000"
python -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# ── Frontend ─────────────────────────────────────────────────────────────────
cd ../frontend
echo "📦 Installing frontend dependencies..."
npm install --silent

# Clear stale Next.js/webpack cache (fixes "Cannot find module './980.js'" errors)
echo "🧹 Clearing frontend build cache..."
rm -rf .next node_modules/.cache

echo "🎨 Starting Next.js frontend on http://localhost:3000"
NEXT_PUBLIC_API_URL=http://localhost:8000 node node_modules/next/dist/bin/next dev -p 3000 &
FRONTEND_PID=$!

echo ""
echo "✅ Revradar is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM
wait $BACKEND_PID $FRONTEND_PID
