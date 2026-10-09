# Huroof AlKora Windows Edition - reproducible portable archive (non-admin).
[CmdletBinding()]
param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$desktop = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dist = Join-Path $desktop 'dist'
$folder = Join-Path $dist 'windows-x64'
$archive = Join-Path $dist 'Huroof-AlKora-Windows-v1.2.1-x64.zip'
if (!$SkipBuild) {
    & (Join-Path $PSScriptRoot 'Build-Windows.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Build-Windows.ps1 failed.' }
}
foreach ($required in @('HuroofAlKora.exe','game\runtime\node.exe','game\dist\client\index.html',
                       'game\server\index.mjs','game\seed\questions.json')) {
    $path = Join-Path $folder $required
    if (!(Test-Path $path)) { throw "Incomplete release: $required is missing" }
}
if (Test-Path $archive) { Remove-Item $archive -Force }
Compress-Archive -Path (Join-Path $folder '*') -DestinationPath $archive -CompressionLevel Optimal
$hash = (Get-FileHash $archive -Algorithm SHA256).Hash.ToLowerInvariant()
[System.IO.File]::WriteAllText("$archive.sha256.txt", "$hash  $(Split-Path $archive -Leaf)`r`n", [System.Text.Encoding]::ASCII)
Write-Host "PORTABLE: $archive"
Write-Host "SHA256: $hash"
Write-Host 'No admin rights required. Extract the entire ZIP before running HuroofAlKora.exe.'
Write-Host 'WebView2 Evergreen Runtime must be available on the player computer.'
