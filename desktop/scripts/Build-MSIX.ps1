# Create an unsigned MSIX package for upload to Microsoft Partner Center.
# IdentityName/Publisher MUST exactly match the reserved app identity in Partner Center.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$IdentityName,
  [Parameter(Mandatory=$true)][string]$Publisher,
  [Parameter(Mandatory=$true)][string]$PublisherDisplayName,
  [string]$Version = '1.2.1.0'
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$publish = Join-Path $root 'dist\windows-x64'
$stage = Join-Path $root 'dist\msix-stage'
$assetDir = Join-Path $root 'src\HuroofAlKora\Assets'
$outDir = Join-Path $root 'dist'
if (!(Test-Path (Join-Path $publish 'HuroofAlKora.exe'))) { throw 'Run scripts\Build-Windows.ps1 before building MSIX.' }
if (!(Test-Path (Join-Path $assetDir 'Square150x150Logo.png'))) { throw 'Store assets are missing.' }
if (!(($Version -split '\.').Count -eq 4) -or $Version -notmatch '^\d+\.\d+\.\d+\.0$') {
  throw 'Version must use 4 parts and end with .0 (for example, 1.0.0.0).'
}
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $stage
New-Item -ItemType Directory -Force -Path $stage | Out-Null
Copy-Item (Join-Path $publish '*') $stage -Recurse -Force
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'Assets') | Out-Null
Copy-Item (Join-Path $assetDir '*Logo.png') (Join-Path $stage 'Assets') -Force
$xmlIdentity = [Security.SecurityElement]::Escape($IdentityName)
$xmlPublisher = [Security.SecurityElement]::Escape($Publisher)
$xmlDisplay = [Security.SecurityElement]::Escape($PublisherDisplayName)
$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
 xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
 xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
 IgnorableNamespaces="uap rescap">
 <Identity Name="$xmlIdentity" Publisher="$xmlPublisher" Version="$Version" ProcessorArchitecture="x64" />
 <Properties>
  <DisplayName>حروف الكورة</DisplayName>
  <PublisherDisplayName>$xmlDisplay</PublisherDisplayName>
  <Logo>Assets\StoreLogo.png</Logo>
 </Properties>
 <Dependencies>
  <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26100.0" />
 </Dependencies>
 <Resources><Resource Language="ar-sa" /></Resources>
 <Applications>
  <Application Id="HuroofAlKora" Executable="HuroofAlKora.exe" EntryPoint="Windows.FullTrustApplication">
   <uap:VisualElements DisplayName="حروف الكورة" Description="لعبة حروف الكورة الجماعية"
    Square150x150Logo="Assets\Square150x150Logo.png"
    Square44x44Logo="Assets\Square44x44Logo.png"
    BackgroundColor="#0C1630">
    <uap:DefaultTile Wide310x150Logo="Assets\Wide310x150Logo.png" Square310x310Logo="Assets\Square310x310Logo.png" />
   </uap:VisualElements>
  </Application>
 </Applications>
 <Capabilities><rescap:Capability Name="runFullTrust" /></Capabilities>
</Package>
"@
[System.IO.File]::WriteAllText((Join-Path $stage 'AppxManifest.xml'), $manifest, [System.Text.UTF8Encoding]::new($false))
$kit = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
$makeappx = Get-ChildItem $kit -Filter MakeAppx.exe -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '\\x64\\' } | Sort-Object FullName -Descending | Select-Object -First 1
if (!$makeappx) { throw 'Install Windows 10/11 SDK (MakeAppx.exe) before packaging.' }
$outPath = Join-Path $outDir "HuroofAlKora_${Version}_x64.msix"
if (Test-Path $outPath) { Remove-Item $outPath -Force }
& $makeappx.FullName pack /d $stage /p $outPath /o
if ($LASTEXITCODE -ne 0) { throw 'MakeAppx failed' }
Write-Host "Unsigned Store package created: $outPath"
Write-Host 'Upload this package through Microsoft Partner Center after testing and reserving the matching identity.'
