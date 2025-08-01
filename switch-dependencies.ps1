# PowerShell wrapper for dependency switching script
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("online", "offline", "list", "build")]
    [string]$Mode,
    
    [Parameter(Mandatory=$false)]
    [string[]]$Packages = @(),
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Path = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("patch", "minor", "major")]
    [string]$VersionBump = "patch"
)

# Change to script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Build command arguments
$scriptArgs = @($Mode)
if ($Packages.Count -gt 0) {
    $scriptArgs += $Packages
}
if ($Version -ne "") {
    $scriptArgs += "--version=$Version"
}
if ($Path -ne "") {
    $scriptArgs += "--path=$Path"
}
if ($DryRun) {
    $scriptArgs += "--dry-run"
}
if ($VersionBump -ne "patch") {
    $scriptArgs += "--version-bump=$VersionBump"
}

# Execute the Node.js script
Write-Host "Executing dependency switch script..." -ForegroundColor Green
node switch-dependencies.js @scriptArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nScript executed successfully!" -ForegroundColor Green
} else {
    Write-Host "`nScript execution failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}
