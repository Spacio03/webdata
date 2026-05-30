#!/usr/bin/env bash
# Stop stray Next dev servers, wipe cache, start fresh on port 3000.
set -e
cd "$(dirname "$0")/.."

echo "Stopping Next.js dev servers…"
for port in 3000 3001 3002 3003 3004 3005; do
  if lsof -ti :"$port" >/dev/null 2>&1; then
    lsof -ti :"$port" | xargs kill -9 2>/dev/null || true
  fi
done
pkill -f "next/dist/bin/next dev" 2>/dev/null || true
sleep 1

echo "Clearing .next and webpack cache…"
rm -rf .next node_modules/.cache

echo "Starting Next.js on http://localhost:3000"
exec node node_modules/next/dist/bin/next dev -p 3000
