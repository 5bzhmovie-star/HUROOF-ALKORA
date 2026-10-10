# Huroof AlKora v15: compiles the real game and includes a private Node.js server.
[CmdletBinding()]
param([switch]$SkipNodeInstall)
$ErrorActionPreference = 'Stop'
$desktop = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$root = (Resolve-Path (Join-Path $desktop '..')).Path
$site = Join-Path $root 'website'
$project = Join-Path $desktop 'src\HuroofAlKora\HuroofAlKora.csproj'
$output = Join-Path $desktop 'dist\windows-x64'
if (!(Test-Path (Join-Path $site 'package.json'))) { throw "Website source not found: $site" }
if (!(Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 24 or newer (x64) before building.' }
$major = [int](& node -p 'process.versions.node.split(".")[0]')
if ($major -lt 24) { throw "Node.js 24 or newer is required. Current major: $major" }
if (!(Get-Command dotnet -ErrorAction SilentlyContinue)) { throw 'Install the .NET 8 SDK before building.' }
if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) { throw 'Install pnpm 11: npm install --global pnpm@11.19.0' }
Push-Location $site
try {
    if (!$SkipNodeInstall) {
        & pnpm install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) { throw 'pnpm install failed' }
    }
    # Download actual licensed atlas images into the archive, not placeholder icon URLs.
    # This stops the release when any indexed player portrait or competition crest is missing.
    & node scripts/build-atlas-media.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Atlas photo/crest bundle is incomplete. Release aborted.' }
    & pnpm run build:selfhost
    if ($LASTEXITCODE -ne 0) { throw 'Self-hosted React build failed' }
    $testFiles = @(Get-ChildItem (Join-Path $site 'tests') -Filter '*.test.mjs' | ForEach-Object { $_.FullName })
    & node --test @testFiles
    if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed. Desktop packaging aborted.' }
} finally { Pop-Location }
$index = Join-Path $site 'dist\client\index.html'
if (!(Test-Path $index)) { throw "Compiled frontend missing: $index" }
New-Item -ItemType Directory -Force -Path $output | Out-Null
& (Join-Path $PSScriptRoot 'Generate-BrandAssets.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Brand asset generation failed' }
& dotnet publish $project --configuration Release --runtime win-x64 --self-contained true `
    -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true `
    -p:DebugType=None -p:DebugSymbols=false --output $output
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed' }
$game = Join-Path $output 'game'
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $game
New-Item -ItemType Directory -Force -Path (Join-Path $game 'runtime') | Out-Null
Copy-Item (Join-Path $site 'server') (Join-Path $game 'server') -Recurse -Force
Copy-Item (Join-Path $site 'seed') (Join-Path $game 'seed') -Recurse -Force
New-Item -ItemType Directory -Force -Path (Join-Path $game 'dist') | Out-Null
Copy-Item (Join-Path $site 'dist\client') (Join-Path $game 'dist\client') -Recurse -Force
if (Test-Path (Join-Path $site 'licenses')) { Copy-Item (Join-Path $site 'licenses') (Join-Path $game 'licenses') -Recurse -Force }
$nodeCmd = (Get-Command node).Source
Copy-Item $nodeCmd (Join-Path $game 'runtime\node.exe') -Force
$nodeLicense = Join-Path (Split-Path $nodeCmd -Parent) 'LICENSE'
if (Test-Path $nodeLicense) { Copy-Item $nodeLicense (Join-Path $game 'runtime\NODE-LICENSE.txt') -Force }
$exe = Join-Path $output 'HuroofAlKora.exe'
if (!(Test-Path $exe)) { throw 'Windows application is missing after publishing.' }
Write-Host "Desktop release created: $output"
Write-Host 'Run HuroofAlKora.exe from inside this folder. Keep the game/ folder together with the EXE.'
Write-Host 'The browser UI and game engine run locally; WebView2 Runtime is required.'
