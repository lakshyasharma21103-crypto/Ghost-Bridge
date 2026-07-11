$ErrorActionPreference = 'Stop'

$ports = @(5000, 5001, 5002, 5173, 5174)

try {
  $connections = Get-NetTCPConnection -State Listen -ErrorAction Stop |
    Where-Object { $ports -contains [int]$_.LocalPort } |
    Sort-Object LocalPort, OwningProcess
} catch {
  Write-Error "Unable to inspect TCP listeners. Run this script from an elevated PowerShell session if Windows denies access."
  exit 1
}

if (-not $connections) {
  Write-Host 'No listeners found on Agent Passport Runtime Gateway development ports.'
  exit 0
}

$connections |
  Select-Object LocalPort, OwningProcess -Unique |
  ForEach-Object {
    $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue

    [pscustomobject]@{
      Port = $_.LocalPort
      PID = $_.OwningProcess
      'Process name' = if ($process) { $process.ProcessName } else { '<unknown>' }
      'Executable path' = if ($process -and $process.Path) { $process.Path } else { '<unavailable>' }
    }
  } |
  Format-Table -AutoSize
