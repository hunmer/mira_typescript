param(
    [string]$ImageName = "mira-dashboard",
    [string]$Tag = "latest", 
    [string]$ApiUrl = "http://localhost:8081",
    [string]$Port = "3999",
    [switch]$Optimized
)

$ErrorActionPreference = "Stop"

Write-Host "Building Docker image: $ImageName`:$Tag" -ForegroundColor Green
Write-Host "API_BASE_URL: $ApiUrl" -ForegroundColor Yellow
Write-Host "PORT: $Port" -ForegroundColor Yellow

try {
    if ($Optimized) {
        Write-Host "Using optimized Dockerfile..." -ForegroundColor Cyan
        $dockerfile = "Dockerfile.optimized"
    } else {
        Write-Host "Using standard Dockerfile..." -ForegroundColor Cyan
        $dockerfile = "Dockerfile"
    }

    $buildArgs = @(
        "--build-arg", "API_BASE_URL=$ApiUrl",
        "--build-arg", "APP_PORT=$Port",
        "-f", $dockerfile,
        "-t", "$ImageName`:$Tag",
        "."
    )

    & docker build @buildArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Build successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "To run the container:" -ForegroundColor Yellow
        Write-Host "docker run -d -p $Port`:$Port -e API_BASE_URL=$ApiUrl -e PORT=$Port --name mira-dashboard $ImageName`:$Tag" -ForegroundColor White
        Write-Host ""
        Write-Host "To run with custom environment:" -ForegroundColor Yellow
        Write-Host "docker run -d -p 4000:4000 -e API_BASE_URL=http://your-api-server:8081 -e PORT=4000 --name mira-dashboard $ImageName`:$Tag" -ForegroundColor White
    } else {
        throw "Docker build failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Error "Build failed: $_"
    exit 1
}
