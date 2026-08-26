#Requires -Version 5.1
<#
.SYNOPSIS
  Assign userId to image .meta.json files that are missing it (shows as 系统/API).

.PARAMETER DataDir
  PicHost data directory (contains images/, twikoo/, pichost.db). Default: ./data

.PARAMETER UserId
  Target user id. If omitted, uses the first admin from pichost.db.

.PARAMETER Apply
  Actually write files. Without this flag, only prints what would change (dry-run).

.EXAMPLE
  cd D:\Ou\PicHost
  .\scripts\assign-image-owner.ps1

.EXAMPLE
  .\scripts\assign-image-owner.ps1 -DataDir D:\pic-host\data -Apply

.EXAMPLE
  .\scripts\assign-image-owner.ps1 -UserId 1 -Apply
#>
[CmdletBinding()]
param(
  [string] $DataDir = (Join-Path (Get-Location) 'data'),
  [int] $UserId = 0,
  [switch] $Apply
)

$ErrorActionPreference = 'Stop'

function Resolve-AdminUserId {
  param([string] $DbPath)

  if (-not (Test-Path -LiteralPath $DbPath)) {
    Write-Warning "pichost.db not found at $DbPath; using UserId = 1"
    return 1
  }

  $repoRoot = Split-Path -Parent $PSScriptRoot
  $nodeFile = Join-Path $env:TEMP "pichost-read-admin-$PID.mjs"
  @'
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync(process.argv[2]);
const row = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").get();
if (!row) process.exit(2);
process.stdout.write(String(row.id));
db.close();
'@ | Set-Content -LiteralPath $nodeFile -Encoding utf8

  Push-Location $repoRoot
  try {
    $output = & node $nodeFile $DbPath 2>&1
    if ($LASTEXITCODE -eq 2) {
      throw "No admin user in database. Run /setup first or pass -UserId explicitly."
    }
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to read admin from database: $output"
    }
    return [int]$output
  }
  finally {
    Pop-Location
    Remove-Item -LiteralPath $nodeFile -ErrorAction SilentlyContinue
  }
}

function Read-MetaJson {
  param([string] $Path)
  $raw = [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
  return $raw | ConvertFrom-Json
}

function Write-MetaJson {
  param(
    [string] $Path,
    [object] $Meta
  )
  # Compact single-line JSON, same style as PicHost putImage()
  $json = $Meta | ConvertTo-Json -Compress -Depth 10
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $json, $utf8)
}

if (-not (Test-Path -LiteralPath $DataDir)) {
  throw "DataDir not found: $DataDir"
}

$resolved = Resolve-Path -LiteralPath $DataDir
$DataDir = if ($resolved.ProviderPath) { $resolved.ProviderPath } else { $resolved.Path }

if ($UserId -le 0) {
  $UserId = Resolve-AdminUserId -DbPath (Join-Path $DataDir 'pichost.db')
}

Write-Host "DataDir : $DataDir"
Write-Host "UserId  : $UserId"
Write-Host "Mode    : $(if ($Apply) { 'APPLY (will modify files)' } else { 'DRY-RUN (pass -Apply to write)' })"
Write-Host ''

$metaFiles = Get-ChildItem -LiteralPath $DataDir -Recurse -File -Filter '*.meta.json' |
  Where-Object { $_.Name -notlike 'pichost.db*' }

if (-not $metaFiles) {
  Write-Host 'No .meta.json files found under DataDir.'
  exit 0
}

$patched = 0
$skipped = 0
$errors = 0

foreach ($file in $metaFiles) {
  try {
    $meta = Read-MetaJson -Path $file.FullName
    $current = $meta.PSObject.Properties['userId']
    $hasUserId = $null -ne $current -and $null -ne $current.Value

    if ($hasUserId) {
      $skipped++
      continue
    }

    $relative = [System.IO.Path]::GetRelativePath($DataDir, $file.FullName)
    Write-Host "[patch] $relative -> userId $UserId"

    if ($Apply) {
      $meta | Add-Member -NotePropertyName userId -NotePropertyValue $UserId -Force
      Write-MetaJson -Path $file.FullName -Meta $meta
    }

    $patched++
  }
  catch {
    $errors++
    Write-Warning "Failed: $($file.FullName) — $_"
  }
}

Write-Host ''
Write-Host "Done. patched=$patched skipped(already had userId)=$skipped errors=$errors"
if (-not $Apply -and $patched -gt 0) {
  Write-Host 'Re-run with -Apply to write changes.'
}
