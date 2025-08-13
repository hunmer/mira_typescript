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
Load-EnvFile ".\\packages\\mira-dashboard\\.env"

# Get port configuration
$DashboardPort = if ($env:MIRA_DASHBOARD_PORT) { $env:MIRA_DASHBOARD_PORT } elseif ($env:VITE_APP_PORT) { $env:VITE_APP_PORT } else { "3000" }

Write-Host "🚀 Starting Mira Dashboard..." -ForegroundColor Green
Write-Host "🖥️  Dashboard will start on port: $DashboardPort" -ForegroundColor Yellow

# Change to dashboard directory and start
Set-Location ".\packages\mira-dashboard"
npm run dev
