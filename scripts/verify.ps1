# ==============================================================================
# scripts/verify.ps1 — Quality Gate Verification Script (PowerShell)
# Development Workspace Standard v1.1 (§19)
# ==============================================================================

$ErrorActionPreference = "Stop"
$env:TMP = "D:\yarn-temp"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 RUNNING QUALITY GATE VERIFICATION PIPELINE" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Verify Backend
Write-Host "`n[1/4] Checking Backend TypeScript & Build..." -ForegroundColor Yellow
Push-Location "backend-nestjs"
try {
    npm run build
    Write-Host "✅ Backend Build Succeeded" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend Build Failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "`n[2/4] Running Backend Unit Tests..." -ForegroundColor Yellow
try {
    npm test -- --passWithNoTests
    Write-Host "✅ Backend Tests Succeeded" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend Tests Failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# 2. Verify Frontend
Write-Host "`n[3/4] Checking Frontend TypeScript..." -ForegroundColor Yellow
Push-Location "frontend"
try {
    npx tsc --noEmit
    Write-Host "✅ Frontend Typecheck Succeeded" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend Typecheck Failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "`n[4/4] Checking Frontend Build..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "✅ Frontend Build Succeeded" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend Build Failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# 3. Synchronize Task Dashboard
Write-Host "`n[5/5] Synchronizing AI Task Dashboard..." -ForegroundColor Yellow
python scripts/update-todos.py

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "🎉 ALL QUALITY GATES PASSED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

