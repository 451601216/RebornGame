# Upload tracked files to GitHub (Contents API init + Git Data API batch)
param(
  [string]$Owner = "451601216",
  [string]$Repo = "RebornGame",
  [string]$Branch = "main",
  [string]$Token = $env:GITHUB_TOKEN
)

if (-not $Token) { Write-Error "Set GITHUB_TOKEN"; exit 1 }

$headers = @{
  Authorization = "Bearer $Token"
  "User-Agent"  = "RebornGame-uploader"
  Accept        = "application/vnd.github+json"
}

$base = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\Git\bin;" + $env:Path
Push-Location $base

function Get-FileBase64([string]$FullPath) {
  $bytes = [System.IO.File]::ReadAllBytes($FullPath)
  return [Convert]::ToBase64String($bytes)
}

function Get-TextUtf8([string]$FullPath) {
  return [System.IO.File]::ReadAllText($FullPath, [System.Text.UTF8Encoding]::new($false))
}

# Resolve git paths to full paths (handles quoted / unicode paths)
$filePaths = @()
git ls-files -z | ForEach-Object {
  if ($_ -eq [char]0) { return }
} 
# PowerShell doesn't split -z well; use git ls-files line by line with quotes
$raw = git -c core.quotepath=false ls-files
foreach ($rel in $raw) {
  if (-not $rel) { continue }
  $full = Join-Path $base $rel
  if (-not (Test-Path -LiteralPath $full)) {
    Write-Warning "Skip missing: $rel"
    continue
  }
  $filePaths += @{ rel = $rel.Replace('\', '/'); full = $full }
}

Write-Host "Files to upload: $($filePaths.Count)"

# Ensure default branch exists via README
$readme = $filePaths | Where-Object { $_.rel -eq "README.md" } | Select-Object -First 1
if ($readme) {
  $content = Get-TextUtf8 $readme.full
  $b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
  $body = @{
    message = "docs: add README"
    content = $b64
    branch  = $Branch
  } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Put `
      -Uri "https://api.github.com/repos/$Owner/$Repo/contents/README.md" `
      -Headers $headers -Body $body -ContentType "application/json; charset=utf-8" | Out-Null
    Write-Host "Initialized branch with README.md"
  } catch {
    $err = $_.ErrorDetails.Message
    if ($err -notmatch "already exists") { throw }
    Write-Host "README.md already on remote"
  }
}

$treeEntries = @()
foreach ($f in $filePaths) {
  if ($f.rel -eq "README.md") { continue }
  $ext = [System.IO.Path]::GetExtension($f.full).ToLower()
  $isBinary = $ext -in @(".ico", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".woff", ".woff2")
  if ($isBinary) {
    $b64 = Get-FileBase64 $f.full
    $blobBody = @{ content = $b64; encoding = "base64" } | ConvertTo-Json
  } else {
    $text = Get-TextUtf8 $f.full
    $blobBody = @{ content = $text; encoding = "utf-8" } | ConvertTo-Json -Depth 3
  }
  $blob = Invoke-RestMethod -Method Post `
    -Uri "https://api.github.com/repos/$Owner/$Repo/git/blobs" `
    -Headers $headers -Body $blobBody -ContentType "application/json; charset=utf-8"
  $treeEntries += @{
    path = $f.rel
    mode = "100644"
    type = "blob"
    sha  = $blob.sha
  }
  Write-Host "  blob $($f.rel)"
}

# Include README blob too for single commit
$readmeText = Get-TextUtf8 $readme.full
$readmeBlobBody = @{ content = $readmeText; encoding = "utf-8" } | ConvertTo-Json
$readmeBlob = Invoke-RestMethod -Method Post `
  -Uri "https://api.github.com/repos/$Owner/$Repo/git/blobs" `
  -Headers $headers -Body $readmeBlobBody -ContentType "application/json; charset=utf-8"
$treeEntries = @(@{ path = "README.md"; mode = "100644"; type = "blob"; sha = $readmeBlob.sha }) + $treeEntries

$treeBody = @{ tree = $treeEntries } | ConvertTo-Json -Depth 6
$tree = Invoke-RestMethod -Method Post `
  -Uri "https://api.github.com/repos/$Owner/$Repo/git/trees" `
  -Headers $headers -Body $treeBody -ContentType "application/json; charset=utf-8"

$commitBody = @{
  message = "Initial commit: RebornGame LLM text reincarnation game"
  tree    = $tree.sha
  author  = @{
    name  = $Owner
    email = "$Owner@users.noreply.github.com"
    date  = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  }
} | ConvertTo-Json -Depth 4

$commit = Invoke-RestMethod -Method Post `
  -Uri "https://api.github.com/repos/$Owner/$Repo/git/commits" `
  -Headers $headers -Body $commitBody -ContentType "application/json; charset=utf-8"

$refBody = @{ sha = $commit.sha; force = $true } | ConvertTo-Json
Invoke-RestMethod -Method Patch `
  -Uri "https://api.github.com/repos/$Owner/$Repo/git/refs/heads/$Branch" `
  -Headers $headers -Body $refBody -ContentType "application/json; charset=utf-8" | Out-Null

Write-Host "Done: https://github.com/$Owner/$Repo"
Pop-Location
