#!/bin/bash
# MOSAIC GTM OS — Quick Start
# Run from the /mosaic directory

set -e

echo "🔷 MOSAIC GTM OS — Starting up"

# ── Copy env ─────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  Created .env from .env.example — fill in your API keys before running!"
  exit 1
fi

# ── Load env for backend process ─────────────────────────────────────────────
set -a
# shellcheck disable=SC1091
source .env
set +a

# ── Backend ──────────────────────────────────────────────────────────────────
echo "📦 Installing backend dependencies..."
cd backend

# Use an isolated venv so conda/system packages don't conflict with cognee/fastapi pins
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

python -m pip install -r requirements.txt --upgrade-strategy only-if-needed --quiet

echo "🚀 Starting FastAPI backend on http://localhost:8000"
python -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# ── Frontend ─────────────────────────────────────────────────────────────────
cd ../frontend
echo "📦 Installing frontend dependencies..."
npm install --silent

echo "🎨 Starting Next.js frontend on http://localhost:3000"
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ MOSAIC is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

wait $BACKEND_PID $FRONTEND_PID
