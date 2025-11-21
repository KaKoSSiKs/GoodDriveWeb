# GoodDrive Startup Script for Windows PowerShell
# Encoding: UTF-8

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   GoodDrive - Full Stack Startup Script" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Preferred container names (dev-first fallback)
$mysqlContainerCandidates = @("gooddrive-mysql-dev", "gooddrive-mysql")
$phpmyadminContainerCandidates = @("gooddrive-phpmyadmin-dev", "gooddrive-phpmyadmin")

function Get-FirstAvailableContainerName {
    param(
        [string[]]$Candidates
    )
    foreach ($name in $Candidates) {
        docker inspect $name >$null 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $name
        }
    }
    return $null
}

function Test-ContainerRunning {
    param([string]$Name)
    if (-not $Name) {
        return $false
    }
    $state = docker inspect -f '{{.State.Running}}' $Name 2>$null
    return ($LASTEXITCODE -eq 0 -and $state -eq "true")
}

function Stop-ContainerIfRunning {
    param([string]$Name)
    if (-not $Name) { return }
    docker inspect $Name >$null 2>&1
    if ($LASTEXITCODE -ne 0) { return }
    $state = docker inspect -f '{{.State.Running}}' $Name 2>$null
    if ($state -eq "true") {
        docker stop $Name >$null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Stopped container: $Name" -ForegroundColor Yellow
        } else {
            Write-Host "WARNING: Failed to stop container $Name. Port conflicts may persist." -ForegroundColor Yellow
        }
    }
}

function Get-PortOwnerProcessId {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
        if ($conn) {
            return $conn.OwningProcess
        }
    } catch {
        # Ignore
    }
    return $null
}

function Stop-ProcessById {
    param([int]$ProcessId)
    if (-not $ProcessId) { return $false }
    try {
        $proc = Get-Process -Id $ProcessId -ErrorAction Stop
        Write-Host "Stopping process $($proc.ProcessName) (PID $ProcessId) using port..." -ForegroundColor Yellow
        Stop-Process -Id $ProcessId -Force -ErrorAction Stop
        Start-Sleep -Seconds 1
        return $true
    } catch {
        Write-Host "WARNING: Failed to stop process with PID $ProcessId. $_" -ForegroundColor Yellow
        return $false
    }
}

function Test-PortInUse {
    param([int]$Port)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect("127.0.0.1", $Port)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Ensure-Port-Free {
    param([int]$Port)
    if (-not (Test-PortInUse -Port $Port)) {
        return $true
    }

    Write-Host "Port $Port is currently in use. Attempting to free it..." -ForegroundColor Yellow
    Stop-ContainerIfRunning -Name "gooddrive-app"
    Stop-ContainerIfRunning -Name "gooddrive-app-dev"
    Start-Sleep -Seconds 2

    if (Test-PortInUse -Port $Port) {
        $pid = Get-PortOwnerProcessId -Port $Port
        if ($pid) {
            if (-not (Stop-ProcessById -ProcessId $pid)) {
                Write-Host "Manual intervention required. Use 'Get-NetTCPConnection -LocalPort $Port | Select-Object -Property OwningProcess' to locate the process." -ForegroundColor Yellow
            }
        }
    }

    if (-not (Test-PortInUse -Port $Port)) {
        Write-Host "OK: Port $Port is now free." -ForegroundColor Green
        return $true
    }

    Write-Host "ERROR: Port $Port is still in use. Please stop the conflicting process (use 'Get-NetTCPConnection -LocalPort $Port') and rerun the script." -ForegroundColor Red
    return $false
}

function Get-ContainerEnvValue {
    param(
        [string]$ContainerName,
        [string]$Key
    )
    if (-not $ContainerName -or -not $Key) {
        return $null
    }
    $envOutput = docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' $ContainerName 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $envOutput) {
        return $null
    }
    $envLines = $envOutput -split '\r?\n'
    if ($LASTEXITCODE -ne 0 -or -not $envLines) {
        return $null
    }
    foreach ($line in $envLines) {
        $trimmed = $line.Trim()
        if (-not $trimmed) { continue }
        if ($trimmed -like "$Key=*") {
            return $trimmed.Substring($Key.Length + 1)
        }
    }
    return $null
}

function Get-EnvValue {
    param(
        [string]$Content,
        [string]$Key,
        [string]$Default = $null
    )
    $pattern = "(?m)^\s*$($Key)\s*=\s*(.+)$"
    $match = [regex]::Match($Content, $pattern)
    if ($match.Success) {
        $value = $match.Groups[1].Value.Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            return $value.Trim('"')
        }
        if ($value.StartsWith("'") -and $value.EndsWith("'")) {
            return $value.Trim("'")
        }
        return $value
    }
    return $Default
}

function Parse-DatabaseUrl {
    param([string]$Url)
    if (-not $Url) { return $null }
    $regex = [regex]'mysql:\/\/(?<user>[^:]+):(?<password>[^@]+)@(?<host>[^:\/]+):(?<port>\d+)\/(?<database>[^?]+)'
    $match = $regex.Match($Url)
    if (-not $match.Success) { return $null }
    return @{
        user = $match.Groups['user'].Value
        password = $match.Groups['password'].Value
        host = $match.Groups['host'].Value
        port = $match.Groups['port'].Value
        database = $match.Groups['database'].Value
    }
}

function Ensure-DatabaseUser {
    param(
        [string]$ContainerName,
        [string]$RootPassword,
        [string]$DbUser,
        [string]$DbPassword,
        [string]$DbName
    )
    if (-not (Test-ContainerRunning -Name $ContainerName)) {
        Write-Host "WARNING: MySQL container is not running. Skipping DB user sync." -ForegroundColor Yellow
        return
    }
    if (-not $ContainerName -or -not $DbUser -or -not $DbPassword -or -not $DbName) {
        return
    }
    $containerRootPassword = Get-ContainerEnvValue -ContainerName $ContainerName -Key "MYSQL_ROOT_PASSWORD"
    if ($containerRootPassword) {
        if ($RootPassword -and $RootPassword -ne $containerRootPassword) {
            Write-Host "INFO: Overriding MYSQL_ROOT_PASSWORD from .env with container value (mismatch detected)." -ForegroundColor DarkGray
        }
        $RootPassword = $containerRootPassword
    }
    if (-not $RootPassword) {
        Write-Host "WARNING: MYSQL_ROOT_PASSWORD is not set in .env or container env. Skipping DB user sync." -ForegroundColor Yellow
        return
    }

    $escapedPassword = $DbPassword.Replace("'", "''")
    $escapedDbName = $DbName.Replace('`', '``')
    $escapedDbUser = $DbUser.Replace("'", "''")
    $sqlLines = @(
        ("CREATE DATABASE IF NOT EXISTS `{0}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -f $escapedDbName),
        ("ALTER USER IF EXISTS '{0}'@'%' IDENTIFIED WITH mysql_native_password BY '{1}';" -f $escapedDbUser, $escapedPassword),
        ("CREATE USER IF NOT EXISTS '{0}'@'%' IDENTIFIED WITH mysql_native_password BY '{1}';" -f $escapedDbUser, $escapedPassword),
        ("GRANT ALL PRIVILEGES ON `{0}`.* TO '{1}'@'%';" -f $escapedDbName, $escapedDbUser),
        "FLUSH PRIVILEGES;"
    )
    $sql = [string]::Join("`n", $sqlLines)
    $errorFile = Join-Path $env:TEMP "ensure-db.err"
    if (Test-Path $errorFile) { Remove-Item $errorFile -Force }
    # Выполняем команду так, чтобы PowerShell не сыпал NativeCommandError даже при ненулевом exit code
    $prevErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    docker exec -i $ContainerName mysql -u root "-p$RootPassword" -e $sql >$null 2>$errorFile
    $ErrorActionPreference = $prevErrorAction
    if ($LASTEXITCODE -eq 0) {
        if (Test-Path $errorFile) { Remove-Item $errorFile -Force }
        Write-Host "OK: Database user '$DbUser' ensured" -ForegroundColor Green
    } else {
        $errMsg = $null
        if (Test-Path $errorFile) {
            $errMsg = Get-Content $errorFile -Raw
            Remove-Item $errorFile -Force
        }
        Write-Host "WARNING: Failed to ensure database user '$DbUser'. Check MySQL credentials." -ForegroundColor Yellow
        if ($errMsg) {
            $trimmed = $errMsg.Trim()
            Write-Host $trimmed -ForegroundColor DarkYellow
            if ($trimmed -match "ERROR 1045") {
                Write-Host "HINT: Ошибка 1045 обычно означает, что MYSQL_ROOT_PASSWORD в контейнере не совпадает с реальным паролем root в базе." -ForegroundColor Yellow
                Write-Host "      Убедитесь, что значения MYSQL_ROOT_PASSWORD / MYSQL_USER / MYSQL_PASSWORD в .env совпадают с docker-compose.dev.yml," -ForegroundColor Yellow
                Write-Host "      затем выполните 'docker compose -f docker-compose.dev.yml down -v' и поднимите контейнер заново." -ForegroundColor Yellow
            } elseif ($trimmed -match "ERROR 2002") {
                Write-Host "HINT: Ошибка 2002 означает, что MySQL ещё не успел полностью запуститься или перезапускается." -ForegroundColor Yellow
                Write-Host "      Подождите несколько секунд и повторите запуск, либо посмотрите логи: 'docker logs $ContainerName'." -ForegroundColor Yellow
            }
        } else {
            Write-Host ("NOTICE: MySQL вернул ненулевой код выхода без текста ошибки. Показываю последние строки логов контейнера {0}:" -f $ContainerName) -ForegroundColor Yellow
            try {
                docker logs $ContainerName --tail 40
            } catch {
                Write-Host ("WARNING: Не удалось прочитать логи контейнера {0}: {1}" -f $ContainerName, $_) -ForegroundColor Yellow
            }
        }
    }
}

# Check Node.js
Write-Host "[1/8] Checking Node.js..." -ForegroundColor Cyan
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Host "Node.js is not installed. Trying to install Node.js 20 LTS автоматически..." -ForegroundColor Yellow

    $nodeInstalled = $false

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "Using winget to install Node.js (OpenJS.NodeJS.LTS)..." -ForegroundColor Yellow
        winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        $nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "Using Chocolatey to install Node.js LTS..." -ForegroundColor Yellow
        choco install nodejs-lts -y
        $nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
    }

    if (-not $nodeInstalled) {
        Write-Host "ERROR: Не удалось установить Node.js автоматически." -ForegroundColor Red
        Write-Host "Скачайте и установите Node.js 20+ с официального сайта: https://nodejs.org/" -ForegroundColor Red
        Write-Host "После установки перезапустите PowerShell и запустите start.ps1 ещё раз." -ForegroundColor Red
        exit 1
    } else {
        Write-Host "OK: Node.js установлен успешно." -ForegroundColor Green
    }
}
$nodeVersion = node --version
Write-Host "OK: Node.js $nodeVersion is installed" -ForegroundColor Green

# Check npm
Write-Host "[2/8] Checking npm..." -ForegroundColor Cyan
$npmInstalled = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmInstalled) {
    # npm ставится вместе с Node.js, поэтому если его нет — подсказываем пользователю
    Write-Host "ERROR: npm не найден в системе, хотя Node.js установлен." -ForegroundColor Red
    Write-Host "Переустановите, пожалуйста, Node.js 20+ с https://nodejs.org/ и перезапустите скрипт." -ForegroundColor Red
    exit 1
}
$npmVersion = npm --version
Write-Host "OK: npm $npmVersion is installed" -ForegroundColor Green

# Check Docker
Write-Host "[3/8] Checking Docker..." -ForegroundColor Cyan
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerInstalled) {
    Write-Host "Docker CLI не найден. Пытаемся установить Docker Desktop автоматически..." -ForegroundColor Yellow

    $dockerInstalled = $false

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "Using winget to install Docker Desktop..." -ForegroundColor Yellow
        winget install -e --id Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements
        $dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "Using Chocolatey to install Docker Desktop..." -ForegroundColor Yellow
        choco install docker-desktop -y
        $dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
    }

    if (-not $dockerInstalled) {
        Write-Host "ERROR: Не удалось установить Docker Desktop автоматически." -ForegroundColor Red
        Write-Host "Скачайте и установите Docker Desktop вручную: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
        Write-Host "После установки перезагрузите систему (рекомендуется) и запустите start.ps1 ещё раз." -ForegroundColor Red
        exit 1
    } else {
        Write-Host "OK: Docker Desktop установлен (может потребоваться перезагрузка перед первым использованием)." -ForegroundColor Green
    }
}

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "OK: Docker is running" -ForegroundColor Green
} catch {
    Write-Host "Docker CLI установлен, но демон не запущен. Пытаемся запустить Docker Desktop..." -ForegroundColor Yellow

    $dockerDesktopPaths = @(
        "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "$Env:ProgramFiles(x86)\Docker\Docker\Docker Desktop.exe"
    )

    $dockerDesktopExe = $dockerDesktopPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($dockerDesktopExe) {
        Write-Host "Starting Docker Desktop: $dockerDesktopExe" -ForegroundColor Yellow
        Start-Process -FilePath $dockerDesktopExe | Out-Null

        # Ждём, пока Docker поднимется
        $maxAttempts = 60
        $attempt = 0
        $dockerOk = $false
        while ($attempt -lt $maxAttempts -and -not $dockerOk) {
            Start-Sleep -Seconds 2
            try {
                docker ps | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    $dockerOk = $true
                }
            } catch {
                # ignore
            }
            $attempt++
        }

        if ($dockerOk) {
            Write-Host "OK: Docker is running" -ForegroundColor Green
        } else {
            Write-Host "ERROR: Не удалось автоматически дождаться запуска Docker Desktop." -ForegroundColor Red
            Write-Host "Пожалуйста, запустите Docker Desktop вручную и повторите запуск скрипта." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "ERROR: Docker Desktop установлен, но исполняемый файл не найден по стандартным путям." -ForegroundColor Red
        Write-Host "Запустите Docker Desktop вручную и повторите запуск скрипта." -ForegroundColor Red
        exit 1
    }
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
$mysqlContainerName = Get-FirstAvailableContainerName -Candidates $mysqlContainerCandidates
if (-not $mysqlContainerName) {
    $mysqlContainerName = $mysqlContainerCandidates[0]
}
$phpmyadminContainerName = Get-FirstAvailableContainerName -Candidates $phpmyadminContainerCandidates
if (-not $phpmyadminContainerName) {
    $phpmyadminContainerName = $phpmyadminContainerCandidates[0]
}

$mysqlRunning = Test-ContainerRunning -Name $mysqlContainerName
$phpmyadminRunning = Test-ContainerRunning -Name $phpmyadminContainerName

if ($mysqlRunning -and $phpmyadminRunning) {
    Write-Host "OK: All Docker containers are running" -ForegroundColor Green
    Write-Host "   - MySQL: $mysqlContainerName" -ForegroundColor White
    Write-Host "   - PhpMyAdmin: $phpmyadminContainerName" -ForegroundColor White
} else {
    Write-Host "Starting Docker services..." -ForegroundColor Yellow
    $composeCmd = if (Get-Command docker-compose -ErrorAction SilentlyContinue) { "docker-compose" } else { "docker compose" }
    $composeFile = if (Test-Path "docker-compose.dev.yml") { "-f docker-compose.dev.yml" } else { "" }

    if (-not $mysqlRunning) {
        if (Test-ContainerRunning -Name $mysqlContainerName) {
            docker start $mysqlContainerName >$null 2>&1
        } else {
            Write-Host "Creating dev containers via docker compose..." -ForegroundColor Yellow
            Invoke-Expression "$composeCmd $composeFile up -d mysql phpmyadmin" >$null 2>&1
            $mysqlContainerName = if ($composeFile) { "gooddrive-mysql-dev" } else { $mysqlContainerName }
            $phpmyadminContainerName = if ($composeFile) { "gooddrive-phpmyadmin-dev" } else { $phpmyadminContainerName }
        }
        $mysqlRunning = Test-ContainerRunning -Name $mysqlContainerName
        if ($mysqlRunning) {
            Write-Host "Started MySQL container: $mysqlContainerName" -ForegroundColor Green
        } else {
            Write-Host "WARNING: Failed to start MySQL container $mysqlContainerName" -ForegroundColor Yellow
        }
    }

    if (-not $phpmyadminRunning) {
        docker start $phpmyadminContainerName >$null 2>&1
        $phpmyadminRunning = Test-ContainerRunning -Name $phpmyadminContainerName
        if ($phpmyadminRunning) {
            Write-Host "Started PhpMyAdmin container: $phpmyadminContainerName" -ForegroundColor Green
        }
    }

    if (-not ($mysqlRunning -and $phpmyadminRunning) -and $composeFile) {
        Write-Host "Ensuring dev containers are up via docker compose..." -ForegroundColor Yellow
        Invoke-Expression "$composeCmd $composeFile up -d mysql phpmyadmin" >$null 2>&1
        $mysqlRunning = Test-ContainerRunning -Name "gooddrive-mysql-dev"
        if ($mysqlRunning) {
            $mysqlContainerName = "gooddrive-mysql-dev"
        }
        $phpmyadminRunning = Test-ContainerRunning -Name "gooddrive-phpmyadmin-dev"
        if ($phpmyadminRunning) {
            $phpmyadminContainerName = "gooddrive-phpmyadmin-dev"
        }
    }

    Write-Host "Waiting for MySQL to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    $maxAttempts = 30
    $attempt = 0
    $mysqlReady = $false
    while ($attempt -lt $maxAttempts -and -not $mysqlReady) {
        try {
            docker exec $mysqlContainerName mysqladmin ping -h localhost >$null 2>&1
            if ($LASTEXITCODE -eq 0) {
                $mysqlReady = $true
            }
        } catch {
            # ignore
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

# Check if DATABASE_URL points to localhost (not docker hostname)
Write-Host "[6/8] Configuring database connection..." -ForegroundColor Cyan
$envContent = Get-Content .env -Raw
$dbUrlUpdated = $false
if ($envContent -match '@mysql:3306') {
    Write-Host "Fixing DATABASE_URL to use localhost..." -ForegroundColor Yellow
    $envContent = $envContent -replace '@mysql:3306', '@127.0.0.1:3306'
    $dbUrlUpdated = $true
}
if ($envContent -match '@gooddrive-mysql-dev:3306') {
    Write-Host "Fixing DATABASE_URL to use localhost..." -ForegroundColor Yellow
    $envContent = $envContent -replace '@gooddrive-mysql-dev:3306', '@127.0.0.1:3306'
    $dbUrlUpdated = $true
}
if ($dbUrlUpdated) {
    Set-Content .env -Value $envContent -Encoding utf8
    Write-Host "OK: DATABASE_URL updated to localhost:3306" -ForegroundColor Green
} else {
    Write-Host "OK: DATABASE_URL is correctly configured" -ForegroundColor Green
}

$databaseUrl = Get-EnvValue -Content $envContent -Key "DATABASE_URL"
$dbInfo = Parse-DatabaseUrl -Url $databaseUrl
$rootPassword = Get-EnvValue -Content $envContent -Key "MYSQL_ROOT_PASSWORD"
if ($dbInfo) {
    Write-Host "Ensuring database user permissions..." -ForegroundColor Cyan
    Ensure-DatabaseUser -ContainerName $mysqlContainerName -RootPassword $rootPassword -DbUser $dbInfo.user -DbPassword $dbInfo.password -DbName $dbInfo.database
} else {
    Write-Host "WARNING: Unable to parse DATABASE_URL. Skipping DB user sync." -ForegroundColor Yellow
}

# Ensure local dev overrides
Write-Host "Applying local development overrides..." -ForegroundColor Cyan
$nodeEnvMatch = [regex]::Match($envContent, "(?m)^\s*NODE_ENV\s*=\s*(.+)$")
if ($nodeEnvMatch.Success) {
    $nodeEnvValue = $nodeEnvMatch.Groups[1].Value.Trim()
    if ($nodeEnvValue -ne "development") {
        Write-Host "WARNING: NODE_ENV in .env is set to '$nodeEnvValue'. Overriding to 'development' for local dev server." -ForegroundColor Yellow
    }
} else {
    Write-Host "INFO: NODE_ENV not defined in .env. Using 'development' for this session." -ForegroundColor DarkGray
}
$env:NODE_ENV = "development"

if (-not (Ensure-Port-Free -Port 3000)) {
    exit 1
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
$prismaClientDir = Join-Path (Get-Location) "node_modules\.prisma"
if (Test-Path $prismaClientDir) {
	try {
		Remove-Item -Recurse -Force $prismaClientDir
		Write-Host "INFO: Cleared existing Prisma artifacts before regenerate." -ForegroundColor DarkGray
	} catch {
		Write-Host "WARNING: Failed to clean .prisma directory: $_" -ForegroundColor Yellow
	}
}
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

# Backfill part categories (assign electronics/engine/suspension/brakes/other for all parts)
Write-Host "Ensuring part categories are filled..." -ForegroundColor Cyan
try {
    node scripts/backfill-part-categories.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Category backfill script exited with code $LASTEXITCODE. Check logs above." -ForegroundColor Yellow
    } else {
        Write-Host "OK: Part categories backfill completed (or was not needed)." -ForegroundColor Green
    }
} catch {
    Write-Host "WARNING: Failed to run backfill-part-categories script: $_" -ForegroundColor Yellow
}

# Import catalog data if needed
Write-Host "Ensuring catalog data is imported..." -ForegroundColor Cyan
$originalImportLimit = $env:IMPORT_LIMIT
$env:IMPORT_LIMIT = "0"
try {
    node scripts/import-data.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Catalog import script exited with code $LASTEXITCODE. Check logs above." -ForegroundColor Yellow
    } else {
        Write-Host "OK: Catalog data import step finished (skips automatically if already present)." -ForegroundColor Green
    }
} catch {
    Write-Host "WARNING: Failed to run catalog import script: $_" -ForegroundColor Yellow
} finally {
    if ($null -ne $originalImportLimit) {
        $env:IMPORT_LIMIT = $originalImportLimit
    } else {
        Remove-Item Env:IMPORT_LIMIT -ErrorAction SilentlyContinue
    }
}

Write-Host "Ensuring default admin user exists..." -ForegroundColor Cyan
try {
    node scripts/create-admin.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Failed to create/update admin user (exit code $LASTEXITCODE)." -ForegroundColor Yellow
    } else {
        Write-Host "OK: Admin user ensured (login: admin / 12345678)." -ForegroundColor Green
    }
} catch {
    Write-Host "WARNING: Unable to run create-admin script: $_" -ForegroundColor Yellow
}

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

