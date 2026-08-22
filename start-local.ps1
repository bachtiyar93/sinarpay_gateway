$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

function Clear-StalePort {
  param([int]$Port)

  $processIds = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($pid in $processIds) {
    if ($pid -and $pid -gt 0) {
      Write-Host "Stopping stale process on port $Port (PID $pid)" -ForegroundColor Yellow
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
  }
}

Clear-StalePort -Port 3000
Clear-StalePort -Port 3001

node .\scripts\start-local.js
