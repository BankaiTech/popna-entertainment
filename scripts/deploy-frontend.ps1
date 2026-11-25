# Deploy the LCO Desk web app to S3 (lcodesk.in) so phones pick up the new version by themselves.
#
#   cd D:\React\popna\popna-entertainment
#   .\scripts\deploy-frontend.ps1
#
# Cache rules (Cloudflare and browsers follow them):
#   assets/*  file names change every build -> cache for 1 year
#   the rest  (index.html, sw.js, locales, icons...) -> "no-cache": always checked for a new version
# Nothing is deleted from the bucket, so files uploaded by hand (e.g. .well-known/assetlinks.json) stay.
param(
  [string]$Bucket = "lcodesk.in"
)
$ErrorActionPreference = "Stop"

Write-Host "1/3 Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed. Nothing uploaded." -ForegroundColor Red; exit 1 }

Write-Host "2/3 Uploading assets (cached 1 year)..." -ForegroundColor Cyan
aws s3 sync .\dist\assets "s3://$Bucket/assets" --cache-control "public, max-age=31536000, immutable"
if ($LASTEXITCODE -ne 0) { Write-Host "Upload failed." -ForegroundColor Red; exit 1 }

Write-Host "3/3 Uploading index.html, service worker, translations, icons (always re-checked)..." -ForegroundColor Cyan
# cp (not sync) so the cache header is set on every file, even unchanged ones. Uploaded last, so a phone
# never gets a new index.html that points to files that are not there yet.
aws s3 cp .\dist "s3://$Bucket" --recursive --exclude "assets/*" --cache-control "no-cache"
if ($LASTEXITCODE -ne 0) { Write-Host "Upload failed." -ForegroundColor Red; exit 1 }

Write-Host "Done. Phones switch to the new version the next time it is safe (no purge needed)." -ForegroundColor Green
