# GoodDrive Startup Script for Windows PowerShell
# Encoding: UTF-8

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   GoodDrive - Full Stack Startup Script" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[1/8] Checking Node.js..." -ForegroundColor Cyan
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Host "ERROR: Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
$nodeVersion = node --version
Write-Host "OK: Node.js $nodeVersion is installed" -ForegroundColor Green

# Check npm
Write-Host "[2/8] Checking npm..." -ForegroundColor Cyan
$npmInstalled = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmInstalled) {
    Write-Host "ERROR: npm is not installed." -ForegroundColor Red
    exit 1
}
$npmVersion = npm --version
Write-Host "OK: npm $npmVersion is installed" -ForegroundColor Green

# Check Docker
Write-Host "[3/8] Checking Docker..." -ForegroundColor Cyan
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerInstalled) {
    Write-Host "ERROR: Docker is not installed. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "OK: Docker is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check .env file
Write-Host "[4/8] Checking .env file..." -ForegroundColor Cyan
if (-not (Test-Path .env)) {
    if (Test-Path .env.example) {
        Write-Host "WARNING: .env file not found. Creating from .env.example..." -ForegroundColor Yellow
        Copy-Item .env.example .env
        Write-Host "OK: .env file created. Please review and update it if needed." -ForegroundColor Green
    } else {
        Write-Host "ERROR: .env file not found and .env.example does not exist." -ForegroundColor Red
        Write-Host "Please create .env file manually with required environment variables." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "OK: .env file exists" -ForegroundColor Green
}

# Check and start Docker services
Write-Host "[5/8] Checking Docker containers..." -ForegroundColor Cyan
$mysqlContainers = docker ps -a --filter "name=mysql" --format "{{.Names}}" | Where-Object { $_ -like "*mysql*" }
$phpmyadminContainers = docker ps -a --filter "name=phpmyadmin" --format "{{.Names}}" | Where-Object { $_ -like "*phpmyadmin*" }
$mysqlRunning = docker ps --filter "name=mysql" --format "{{.Names}}" | Where-Object { $_ -like "*mysql*" }
$phpmyadminRunning = docker ps --filter "name=phpmyadmin" --format "{{.Names}}" | Where-Object { $_ -like "*phpmyadmin*" }

$allRunning = $true
if (-not $mysqlRunning) {
    $allRunning = $false
    Write-Host "MySQL container is not running" -ForegroundColor Yellow
}
if (-not $phpmyadminRunning) {
    $allRunning = $false
    Write-Host "PhpMyAdmin container is not running" -ForegroundColor Yellow
}

if ($allRunning) {
    Write-Host "OK: All Docker containers are running" -ForegroundColor Green
    Write-Host "   - MySQL: $($mysqlRunning -join ', ')" -ForegroundColor White
    Write-Host "   - PhpMyAdmin: $($phpmyadminRunning -join ', ')" -ForegroundColor White
} else {
    Write-Host "Starting Docker services..." -ForegroundColor Yellow
    
    # Try to start existing containers first
    $started = $false
    if ($mysqlContainers) {
        foreach ($container in $mysqlContainers) {
            docker start $container 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Started MySQL container: $container" -ForegroundColor Green
                $started = $true
            }
        }
    }
    if ($phpmyadminContainers) {
        foreach ($container in $phpmyadminContainers) {
            docker start $container 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Started PhpMyAdmin container: $container" -ForegroundColor Green
            }
        }
    }
    
    if (-not $started) {
        Write-Host "Containers not found. Creating via docker-compose..." -ForegroundColor Yellow
        # Try docker compose (new) or docker-compose (old)
        $composeCmd = if (Get-Command docker -ErrorAction SilentlyContinue) { "docker compose" } else { "docker-compose" }
        $composeFile = if (Test-Path "docker-compose.dev.yml") { "-f docker-compose.dev.yml" } else { "" }
        
        # Запускаем MySQL и PhpMyAdmin (приложение запускаем локально через npm)
        Write-Host "Starting MySQL and PhpMyAdmin containers..." -ForegroundColor Yellow
        Invoke-Expression "$composeCmd $composeFile up -d mysql phpmyadmin" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK: Docker services started" -ForegroundColor Green
            $started = $true
        } else {
            Write-Host "WARNING: Failed to start via docker-compose. Please check docker-compose.dev.yml" -ForegroundColor Yellow
        }
    }
    
    # Wait for MySQL to be ready (если контейнер был запущен)
    if ($started -or $mysqlRunning) {
        $containerName = if ($mysqlRunning) { $mysqlRunning[0] } elseif ($mysqlContainers) { $mysqlContainers[0] } else { "gooddrive-mysql" }
        Write-Host "Waiting for MySQL to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        $maxAttempts = 30
        $attempt = 0
        $mysqlReady = $false
        
        while ($attempt -lt $maxAttempts -and -not $mysqlReady) {
            try {
                $result = docker exec $containerName mysqladmin ping -h localhost 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $mysqlReady = $true
                }
            } catch {
                # Ignore errors
            }
            
            if (-not $mysqlReady) {
                Start-Sleep -Seconds 2
                $attempt++
                Write-Host "." -NoNewline -ForegroundColor Yellow
            }
        }
        Write-Host ""
        
        if (-not $mysqlReady) {
            Write-Host "WARNING: MySQL may not be fully ready. Continuing anyway..." -ForegroundColor Yellow
        } else {
            Write-Host "OK: MySQL is ready!" -ForegroundColor Green
        }
    }
}

# Check if DATABASE_URL points to localhost (not docker hostname)
Write-Host "[6/8] Configuring database connection..." -ForegroundColor Cyan
$envContent = Get-Content .env -Raw
if ($envContent -match 'mysql://[^@]+@mysql:3306') {
    Write-Host "Fixing DATABASE_URL to use localhost..." -ForegroundColor Yellow
    $envContent = $envContent -replace '@mysql:3306', '@localhost:3306'
    Set-Content .env -Value $envContent -NoNewline
    Write-Host "OK: DATABASE_URL updated to localhost:3306" -ForegroundColor Green
} else {
    Write-Host "OK: DATABASE_URL is correctly configured" -ForegroundColor Green
}

# Check if node_modules exists
Write-Host "[7/8] Checking dependencies..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies." -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "OK: Dependencies are installed" -ForegroundColor Green
}

# Generate Prisma Client
Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate Prisma Client." -ForegroundColor Red
    exit 1
}
Write-Host "OK: Prisma Client generated" -ForegroundColor Green

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Migrations may have failed. Check the output above." -ForegroundColor Yellow
    Write-Host "Trying to push schema..." -ForegroundColor Yellow
    npx prisma db push --skip-generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to sync database schema." -ForegroundColor Red
        exit 1
    }
}
Write-Host "OK: Database is ready" -ForegroundColor Green

# Start development server
Write-Host "[8/8] Starting development server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "   All checks passed! Starting server..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Application will be available at:" -ForegroundColor Cyan
Write-Host "   - Frontend/Backend: http://localhost:3000" -ForegroundColor White
Write-Host "   - Catalog: http://localhost:3000/catalog" -ForegroundColor White
Write-Host "   - Admin Panel: http://localhost:3000/admin" -ForegroundColor White
Write-Host "   - PhpMyAdmin: http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "Admin credentials:" -ForegroundColor Cyan
Write-Host "   Email: admin" -ForegroundColor White
Write-Host "   Password: 12345678" -ForegroundColor White
Write-Host ""
$mysqlContainerName = if ($mysqlRunning) { $mysqlRunning[0] } elseif ($mysqlContainers) { $mysqlContainers[0] } else { "gooddrive-mysql" }
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "   View MySQL logs: docker logs -f $mysqlContainerName" -ForegroundColor White
Write-Host "   Stop MySQL: docker stop $mysqlContainerName" -ForegroundColor White
Write-Host "   Stop server: Press Ctrl+C" -ForegroundColor White
Write-Host ""
Write-Host "================================================" -ForegroundColor Gray
Write-Host "Starting npm run dev..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Gray
Write-Host ""

# Start npm run dev (this will run in foreground)
npm run dev
