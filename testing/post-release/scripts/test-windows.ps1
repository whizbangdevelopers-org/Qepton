# test-windows.ps1 - Test Windows NSIS installer and portable builds
#
# Run this script ON your Windows machine to test release artifacts.
#
# Usage (in PowerShell):
#   .\test-windows.ps1 -Version "1.0.12"
#   .\test-windows.ps1 -Version "1.0.12" -SkipInstaller  # Only test portable
#   .\test-windows.ps1 -Version "1.0.12" -SkipPortable   # Only test installer
#
# Prerequisites:
#   - PowerShell 5.1+ (included in Windows 10)
#   - Internet connection to download releases (or place files in script directory)

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [switch]$SkipInstaller,
    [switch]$SkipPortable,
    [switch]$KeepFiles  # Don't clean up downloaded files
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Status($msg) { Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[+] $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "[-] $msg" -ForegroundColor Red }
function Write-Warn($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TestDir = Join-Path $env:TEMP "qepton-test-$Version"
$InstallerName = "Qepton-Setup-$Version.exe"
$PortableName = "Qepton-$Version-win.7z"

# Alternative naming patterns
$InstallerPatterns = @(
    "Qepton-Setup-$Version.exe",
    "Qepton Setup $Version.exe",
    "qepton-$Version-setup.exe",
    "Qepton_Setup_$Version.exe"
)

$PortablePatterns = @(
    "Qepton-$Version-win.7z",
    "qepton-$Version-win-x64.7z",
    "Qepton-$Version-x64.7z"
)

Write-Host ""
Write-Host "=========================================" -ForegroundColor White
Write-Host "  Windows Release Testing" -ForegroundColor White
Write-Host "  Version: $Version" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor White
Write-Host ""

# Create test directory
if (-not (Test-Path $TestDir)) {
    New-Item -ItemType Directory -Path $TestDir | Out-Null
}
Set-Location $TestDir
Write-Status "Working directory: $TestDir"

# Download helper
function Get-ReleaseArtifact {
    param([string[]]$Patterns, [string]$Description)

    foreach ($pattern in $Patterns) {
        # Check if already exists locally
        $localPath = Join-Path $ScriptDir $pattern
        if (Test-Path $localPath) {
            Write-Status "Found local $Description`: $localPath"
            Copy-Item $localPath -Destination $TestDir
            return Join-Path $TestDir $pattern
        }

        # Try downloading from GitHub
        foreach ($repo in @("Qepton-Dev", "Qepton")) {
            $url = "https://github.com/whizbangdevelopers/$repo/releases/download/v$Version/$pattern"
            $dest = Join-Path $TestDir $pattern

            try {
                Write-Status "Trying: $url"
                Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -ErrorAction Stop
                Write-Success "Downloaded $Description"
                return $dest
            } catch {
                # Continue to next pattern/repo
            }
        }
    }

    return $null
}

# ============================================================================
# NSIS Installer Test
# ============================================================================
if (-not $SkipInstaller) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor White
    Write-Host "  NSIS Installer Test" -ForegroundColor White
    Write-Host "=========================================" -ForegroundColor White
    Write-Host ""

    $installerPath = Get-ReleaseArtifact -Patterns $InstallerPatterns -Description "installer"

    if ($installerPath -and (Test-Path $installerPath)) {
        # Silent install
        Write-Status "Running silent install..."
        $installProcess = Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait -PassThru

        if ($installProcess.ExitCode -eq 0) {
            Write-Success "Installer completed"
        } else {
            Write-Fail "Installer returned exit code: $($installProcess.ExitCode)"
        }

        # Wait for install to settle
        Start-Sleep -Seconds 5

        # Find installed executable
        Write-Status "Looking for installed executable..."
        $installPaths = @(
            "$env:LOCALAPPDATA\Programs\qepton\Qepton.exe",
            "$env:LOCALAPPDATA\Programs\Qepton\Qepton.exe",
            "$env:PROGRAMFILES\Qepton\Qepton.exe",
            "${env:PROGRAMFILES(x86)}\Qepton\Qepton.exe"
        )

        $exePath = $null
        foreach ($path in $installPaths) {
            if (Test-Path $path) {
                $exePath = $path
                Write-Success "Found: $path"
                break
            }
        }

        if ($exePath) {
            # Get file info
            $fileInfo = Get-Item $exePath
            Write-Status "Version: $($fileInfo.VersionInfo.FileVersion)"
            Write-Status "Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB"

            # Launch test
            Write-Status "Launching app (10 second test)..."
            $appProcess = Start-Process -FilePath $exePath -PassThru
            Start-Sleep -Seconds 10

            if (-not $appProcess.HasExited) {
                Write-Success "App is running"

                # Check window exists
                $window = Get-Process -Id $appProcess.Id -ErrorAction SilentlyContinue |
                          Where-Object { $_.MainWindowTitle -ne "" }
                if ($window) {
                    Write-Success "Window title: $($window.MainWindowTitle)"
                }

                # Graceful close
                Write-Status "Closing app..."
                $appProcess.CloseMainWindow() | Out-Null
                Start-Sleep -Seconds 3

                if (-not $appProcess.HasExited) {
                    $appProcess.Kill()
                }
                Write-Success "App closed"
            } else {
                Write-Fail "App exited immediately (exit code: $($appProcess.ExitCode))"
            }
        } else {
            Write-Fail "Could not find installed executable"
            Write-Status "Searched paths:"
            $installPaths | ForEach-Object { Write-Host "  $_" }
        }

        # Uninstall
        Write-Status "Looking for uninstaller..."
        $uninstallers = @(
            "$env:LOCALAPPDATA\Programs\qepton\Uninstall Qepton.exe",
            "$env:LOCALAPPDATA\Programs\Qepton\Uninstall Qepton.exe",
            "$env:PROGRAMFILES\Qepton\Uninstall Qepton.exe"
        )

        foreach ($uninstaller in $uninstallers) {
            if (Test-Path $uninstaller) {
                Write-Status "Running uninstaller..."
                Start-Process -FilePath $uninstaller -ArgumentList "/S" -Wait
                Write-Success "Uninstall completed"

                # Verify removal
                Start-Sleep -Seconds 3
                if ($exePath -and -not (Test-Path $exePath)) {
                    Write-Success "Executable removed"
                } else {
                    Write-Warn "Executable may still exist"
                }
                break
            }
        }
    } else {
        Write-Warn "Installer not found - skipping installer tests"
    }
}

# ============================================================================
# Portable (7z) Test
# ============================================================================
if (-not $SkipPortable) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor White
    Write-Host "  Portable (7z) Test" -ForegroundColor White
    Write-Host "=========================================" -ForegroundColor White
    Write-Host ""

    $portablePath = Get-ReleaseArtifact -Patterns $PortablePatterns -Description "portable archive"

    if ($portablePath -and (Test-Path $portablePath)) {
        # Check for 7-Zip
        $7zPath = "$env:PROGRAMFILES\7-Zip\7z.exe"
        if (-not (Test-Path $7zPath)) {
            $7zPath = "${env:PROGRAMFILES(x86)}\7-Zip\7z.exe"
        }

        if (Test-Path $7zPath) {
            # Extract
            $extractDir = Join-Path $TestDir "portable"
            Write-Status "Extracting to $extractDir..."
            & $7zPath x $portablePath -o"$extractDir" -y | Out-Null
            Write-Success "Extracted"

            # Find executable
            $portableExe = Get-ChildItem -Path $extractDir -Filter "*.exe" -Recurse |
                           Where-Object { $_.Name -match "qepton" -and $_.Name -notmatch "uninstall" } |
                           Select-Object -First 1

            if ($portableExe) {
                Write-Success "Found: $($portableExe.FullName)"

                # Launch test
                Write-Status "Launching portable app (10 second test)..."
                $appProcess = Start-Process -FilePath $portableExe.FullName -PassThru
                Start-Sleep -Seconds 10

                if (-not $appProcess.HasExited) {
                    Write-Success "Portable app is running"

                    # Close
                    $appProcess.CloseMainWindow() | Out-Null
                    Start-Sleep -Seconds 3
                    if (-not $appProcess.HasExited) {
                        $appProcess.Kill()
                    }
                    Write-Success "Portable app closed"
                } else {
                    Write-Fail "Portable app exited immediately"
                }
            } else {
                Write-Fail "Could not find executable in archive"
                Get-ChildItem -Path $extractDir -Recurse | Select-Object FullName
            }
        } else {
            Write-Warn "7-Zip not found - cannot extract portable archive"
            Write-Status "Install 7-Zip from https://www.7-zip.org/"
        }
    } else {
        Write-Warn "Portable archive not found - skipping portable tests"
    }
}

# ============================================================================
# Summary
# ============================================================================
Write-Host ""
Write-Host "=========================================" -ForegroundColor White
Write-Host "  Test Summary" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor White
Write-Host ""
Write-Host "Version tested: $Version"
Write-Host "Test directory: $TestDir"
Write-Host ""
Write-Host "Manual verification checklist:"
Write-Host "  [ ] App window renders correctly"
Write-Host "  [ ] GitHub OAuth login works"
Write-Host "  [ ] Gists fetch and display"
Write-Host "  [ ] Code editor works"
Write-Host "  [ ] Search works"
Write-Host "  [ ] Theme switching works"
Write-Host "  [ ] App closes without errors"
Write-Host ""

# Cleanup
if (-not $KeepFiles) {
    Write-Status "Cleaning up test files..."
    Set-Location $env:TEMP
    Remove-Item -Path $TestDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Success "Cleaned up"
} else {
    Write-Status "Test files kept at: $TestDir"
}

Write-Host ""
Write-Host "Update the release verification issue when complete." -ForegroundColor Cyan
