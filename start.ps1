# GoodDrive Startup Script for Windows PowerShell
# Encoding: UTF-8

Write-Host "Starting GoodDrive..." -ForegroundColor Green
Write-Host ""

# Check Docker
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerInstalled) {
    Write-Host "ERROR: Docker is not installed. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check .env file
if (-not (Test-Path .env)) {
    Write-Host "WARNING: .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "SUCCESS: .env file created." -ForegroundColor Green
}

Write-Host "Starting Docker Compose..." -ForegroundColor Cyan
docker-compose up -d --build

Write-Host ""
Write-Host "Waiting for MySQL to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "GoodDrive successfully started!" -ForegroundColor Green
Write-Host ""
Write-Host "Application is available at:" -ForegroundColor Cyan
Write-Host "   - Frontend/Backend: http://localhost:3000" -ForegroundColor White
Write-Host "   - PhpMyAdmin: http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "Admin credentials:" -ForegroundColor Cyan
Write-Host "   Email: admin@gooddrive.com" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "To view logs use:" -ForegroundColor Cyan
Write-Host "   docker-compose logs -f" -ForegroundColor White
Write-Host ""
Write-Host "To stop use:" -ForegroundColor Cyan
Write-Host "   docker-compose down" -ForegroundColor White
Write-Host ""
