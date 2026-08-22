#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "[1/5] Checking prerequisites..."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js belum terpasang. Install Node.js LTS dari https://nodejs.org/ lalu jalankan ulang script ini."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm belum terpasang. Install Node.js LTS dari https://nodejs.org/ lalu jalankan ulang script ini."
  exit 1
fi

echo "Node: $(node -v)"
echo "npm: $(npm -v)"

echo "[2/5] Installing workspace dependencies if needed..."
npm install

echo "[3/5] Ensuring environment files exist..."
if [ ! -f "apps/backend/.env" ] && [ -f "apps/backend/.env.example" ]; then
  cp "apps/backend/.env.example" "apps/backend/.env"
  echo "Created apps/backend/.env from .env.example"
fi

if [ ! -f "apps/frontend/.env.local" ] && [ -f "apps/frontend/.env.example" ]; then
  cp "apps/frontend/.env.example" "apps/frontend/.env.local"
  echo "Created apps/frontend/.env.local from .env.example"
fi

echo "[4/5] Checking required services..."
if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    echo "Docker detected. Starting PostgreSQL + Redis..."
    docker compose up -d postgres redis || true
    sleep 8
    if npm run db:seed:admin >/dev/null 2>&1; then
      echo "Admin account seeded: admin@sinarpay.test / password123"
    else
      echo "Database belum siap; jalankan 'npm run db:seed:admin' setelah PostgreSQL aktif."
    fi
  else
    echo "Docker detected, but docker compose is unavailable. Start PostgreSQL and Redis manually before backend boot."
  fi
else
  echo "Docker not found. Please install Docker Desktop or start PostgreSQL/Redis manually before running backend."
fi

echo "[5/5] Starting backend and frontend together..."
echo "Open frontend: http://localhost:3000"
echo "Open backend docs: http://localhost:3000/api/docs"
npm run dev
