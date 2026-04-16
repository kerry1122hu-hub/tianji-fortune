$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\\..\\..\\..')
$modeName = if ($env:GOLDEN_STRICT -eq '1') { 'strict' } else { 'subset' }
$outDir = Join-Path $projectRoot ("src\\payment\\.tmp-golden-check-" + $modeName)
$entry = Join-Path $projectRoot 'src\\payment\\interpretation_engine\\golden\\run_golden_cases.ts'

if (Test-Path -LiteralPath $outDir) {
  Remove-Item -LiteralPath $outDir -Recurse -Force
}

Push-Location $projectRoot
try {
  npx tsc --pretty false --target es2020 --module commonjs --outDir $outDir $entry
  node (Join-Path $outDir 'golden\\run_golden_cases.js')
}
finally {
  Pop-Location
  if (Test-Path -LiteralPath $outDir) {
    try {
      Remove-Item -LiteralPath $outDir -Recurse -Force -ErrorAction Stop
    }
    catch {
      Write-Warning ("Cleanup skipped for temp dir: " + $outDir)
    }
  }
}
