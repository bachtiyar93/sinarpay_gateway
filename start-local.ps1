$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Cyan

$node = Get-Command node -ErrorAction SilentlyContinue
$nmp = Get-Command npm -ErrorAction SilentlyContinue

if (-not $node -or -not $nmp) {
  Write-Error "Node.js dan npm belum terpasang. Install Node.js LTS dari https://nodejs.org/ lalu jalankan ulang script ini."
  exit 1
}

Write-Host "Node: $($node.Source)" -ForegroundColor Green
Write-Host "npm: $($nmp.Source)" -ForegroundColor Green

Write-Host "[2/5] Installing workspace dependencies if needed..." -ForegroundColor Cyan
npm install

Write-Host "[3/5] Ensuring environment files exist..." -ForegroundColor Cyan
$backendEnv = Join-Path $repoRoot "apps\backend\.env"
$backendExample = Join-Path $repoRoot "apps\backend\.env.example"
if (-not (Test-Path $backendEnv) -and (Test-Path $backendExample)) {
  Copy-Item $backendExample $backendEnv
  Write-Host "Created apps/backend/.env from .env.example" -ForegroundColor Yellow
}

$frontendEnv = Join-Path $repoRoot "apps\frontend\.env.local"
$frontendExample = Join-Path $repoRoot "apps\frontend\.env.example"
if (-not (Test-Path $frontendEnv) -and (Test-Path $frontendExample)) {
  Copy-Item $frontendExample $frontendEnv
  Write-Host "Created apps/frontend/.env.local from .env.example" -ForegroundColor Yellow
}

Write-Host "[4/5] Checking required services..." -ForegroundColor Cyan
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
  try {
    & docker compose version | Out-Null
    Write-Host "Docker detected. Starting PostgreSQL + Redis..." -ForegroundColor Green
    & docker compose up -d postgres redis
    Start-Sleep -Seconds 8
    try {
      npm run db:seed:admin
    } catch {
      Write-Host "Database not ready yet; run 'npm run db:seed:admin' once PostgreSQL is accepting connections." -ForegroundColor Yellow
    }
  } catch {
    Write-Host "Docker found, but compose command failed. You may need to start PostgreSQL and Redis manually." -ForegroundColor Yellow
  }
} else {
  Write-Host "Docker not found. Please install Docker Desktop or start PostgreSQL/Redis manually before running backend." -ForegroundColor Yellow
}
 
Write-Host "[5/5] Starting backend and frontend together..." -ForegroundColor Cyan
Write-Host "Open frontend: http://localhost:3000" -ForegroundColor Magenta
Write-Host "Open backend docs: http://localhost:3000/api/docs" -ForegroundColor Magenta
npm run dev
