param([switch]$SkipFrontend)
$ErrorActionPreference = 'Stop'
$aegisRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$aegisStage = Join-Path $aegisRoot 'artifacts/native-fix'
$aegisNative = Join-Path $aegisRoot 'src-tauri'
New-Item -ItemType Directory -Path $aegisStage -Force | Out-Null
if (-not $SkipFrontend) {
    Push-Location $aegisRoot
    try { npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' } }
    finally { Pop-Location }
}
foreach ($aegisEntry in @('src','icons','capabilities','build.rs','Cargo.toml','Cargo.lock','tauri.conf.json')) {
    Copy-Item -LiteralPath (Join-Path $aegisNative $aegisEntry) -Destination $aegisStage -Recurse -Force
}
$aegisManifestPath = Join-Path $aegisStage 'Cargo.toml'
$aegisManifest = [IO.File]::ReadAllText($aegisManifestPath).Replace('crate-type = ["staticlib", "cdylib", "rlib"]', 'crate-type = ["rlib"]')
$aegisManifest += @'

[[bin]]
name = "aegis-guard-updated"
path = "src/main.rs"

[profile.release.package.aegis-shield]
opt-level = 0
'@
[IO.File]::WriteAllText($aegisManifestPath, $aegisManifest, (New-Object Text.UTF8Encoding($false)))
$aegisConfigPath = Join-Path $aegisStage 'tauri.conf.json'
$aegisConfig = Get-Content -LiteralPath $aegisConfigPath -Raw | ConvertFrom-Json
# Relative paths avoid Windows drive-letter paths being interpreted as URLs.
$aegisConfig.build.frontendDist = '../../dist'
[IO.File]::WriteAllText($aegisConfigPath, ($aegisConfig | ConvertTo-Json -Depth 20), (New-Object Text.UTF8Encoding($false)))
$aegisPreviousTarget = $env:CARGO_TARGET_DIR
try {
    $env:CARGO_TARGET_DIR = Join-Path $aegisNative 'target'
    cargo build --release --offline --manifest-path $aegisManifestPath --bin aegis-guard-updated --features custom-protocol
    if ($LASTEXITCODE -ne 0) { throw 'Desktop build failed.' }
} finally { $env:CARGO_TARGET_DIR = $aegisPreviousTarget }
$aegisBuilt = Join-Path $aegisNative 'target/release/aegis-guard-updated.exe'
$aegisCheck = New-Object Diagnostics.Process
$aegisCheck.StartInfo.FileName = $aegisBuilt
$aegisCheck.StartInfo.Arguments = '--verify-bundle'
$aegisCheck.StartInfo.UseShellExecute = $false
$aegisCheck.StartInfo.CreateNoWindow = $true
$aegisCheck.StartInfo.WindowStyle = 'Hidden'
$aegisCheck.StartInfo.RedirectStandardError = $true
[void]$aegisCheck.Start()
$aegisError = $aegisCheck.StandardError.ReadToEnd()
$aegisCheck.WaitForExit()
if ($aegisCheck.ExitCode -ne 0) { throw "Bundle verification failed: $aegisError" }
$aegisOutput = Join-Path $aegisRoot 'artifacts/Aegis-Guard-Fixed.exe'
Copy-Item -LiteralPath $aegisBuilt -Destination $aegisOutput -Force
Write-Output "PASS: executable uses production mode and contains its dashboard. Ready: $aegisOutput"
