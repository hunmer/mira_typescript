# Load environment variables from .env files
function Load-EnvFile {
    param([string]$FilePath)
    
    if (Test-Path $FilePath) {
        Get-Content $FilePath | ForEach-Object {
            if ($_ -match "^\s*([^#=]+)=(.*)$") {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($key, $value, "Process")
            }
        }
    }
}

# Load environment variables
Load-EnvFile ".\\.env"
Load-EnvFile ".\\packages\\mira-app-server\\.env"
Load-EnvFile ".\\packages\\mira-dashboard\\.env"

# Get port configurations
$ServerPort = if ($env:MIRA_SERVER_HTTP_PORT) { $env:MIRA_SERVER_HTTP_PORT } elseif ($env:HTTP_PORT) { $env:HTTP_PORT } else { "8080" }
$DashboardPort = if ($env:MIRA_DASHBOARD_PORT) { $env:MIRA_DASHBOARD_PORT } elseif ($env:APP_PORT) { $env:APP_PORT } else { "3000" }

Write-Host "🚀 Starting Mira Full Stack..." -ForegroundColor Green
Write-Host "📡 Server will start on port: $ServerPort" -ForegroundColor Yellow
Write-Host "🖥️  Dashboard will start on port: $DashboardPort" -ForegroundColor Yellow

# Start server in background
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '.\packages\mira-app-server'; npm run dev"

# Wait a bit for server to start
Start-Sleep -Seconds 3

# Start dashboard in background
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '.\packages\mira-dashboard'; npm run dev"

Write-Host "✅ Both services are starting..." -ForegroundColor Green
Write-Host "🌐 Server: http://localhost:$ServerPort" -ForegroundColor Cyan
Write-Host "🖥️  Dashboard: http://localhost:$DashboardPort" -ForegroundColor Cyan
