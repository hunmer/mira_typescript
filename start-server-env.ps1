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
Load-EnvFile ".\\packages\\mira-server\\.env"

# Get port configuration
$ServerPort = if ($env:MIRA_SERVER_HTTP_PORT) { $env:MIRA_SERVER_HTTP_PORT } elseif ($env:HTTP_PORT) { $env:HTTP_PORT } else { "8080" }
$WsPort = if ($env:MIRA_SERVER_WS_PORT) { $env:MIRA_SERVER_WS_PORT } elseif ($env:WS_PORT) { $env:WS_PORT } else { "8081" }

Write-Host "🚀 Starting Mira Server..." -ForegroundColor Green
Write-Host "📡 HTTP Server will start on port: $ServerPort" -ForegroundColor Yellow
Write-Host "🔌 WebSocket Server will start on port: $WsPort" -ForegroundColor Yellow

# Change to server directory and start
Set-Location ".\packages\mira-server"
npm run dev
