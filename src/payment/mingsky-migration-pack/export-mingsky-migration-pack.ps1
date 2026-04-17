param(
  [string]$Destination = ".\\mingsky-standalone-export",
  [string]$SourceCommit = ""
)

$ErrorActionPreference = "Stop"

$packRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $packRoot "..\\..\\..")
$manifestPath = Join-Path $packRoot "mingsky-migration-manifest.json"

if (-not (Test-Path $manifestPath)) {
  throw "Cannot find migration manifest: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$commit = if ([string]::IsNullOrWhiteSpace($SourceCommit)) { $manifest.source_commit } else { $SourceCommit }

$destRoot = Resolve-Path -LiteralPath . -ErrorAction SilentlyContinue
if (-not $destRoot) {
  $destRoot = Get-Location
}

$exportRoot = Join-Path $destRoot $Destination
$sourceOut = Join-Path $exportRoot "source"
$metaOut = Join-Path $exportRoot "migration-meta"
$zipPath = Join-Path $exportRoot "mingsky-source.zip"

New-Item -ItemType Directory -Force -Path $exportRoot | Out-Null
New-Item -ItemType Directory -Force -Path $metaOut | Out-Null

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
if (Test-Path $sourceOut) {
  Remove-Item -LiteralPath $sourceOut -Recurse -Force
}

$includePaths = @()
foreach ($path in $manifest.include_paths) {
  $includePaths += [string]$path
}

$gitArgs = @("-C", [string]$repoRoot, "archive", "--format=zip", "--output=$zipPath", [string]$commit, "--")
$gitArgs += $includePaths

Write-Host "Exporting MingSky pack from commit $commit"
& git @gitArgs

Expand-Archive -LiteralPath $zipPath -DestinationPath $sourceOut -Force

Copy-Item -LiteralPath $manifestPath -Destination (Join-Path $metaOut "mingsky-migration-manifest.json") -Force
Copy-Item -LiteralPath (Join-Path $packRoot "README.md") -Destination (Join-Path $metaOut "README.md") -Force
Copy-Item -LiteralPath (Join-Path $packRoot "mingsky-project-checklist.md") -Destination (Join-Path $metaOut "mingsky-project-checklist.md") -Force

$summary = @"
MingSky migration pack exported successfully.

Source commit: $commit
Repo root: $repoRoot
Export root: $exportRoot

Next:
1. Create a new standalone repository
2. Copy files from source\
3. Follow migration-meta\mingsky-project-checklist.md
"@

Set-Content -LiteralPath (Join-Path $metaOut "EXPORT_SUMMARY.txt") -Value $summary -Encoding UTF8

Write-Host ""
Write-Host $summary
