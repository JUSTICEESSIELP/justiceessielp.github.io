# One-step setup for the cover letter backend.
# Asks for your Cloudflare token, AnyAPI key and admin password, then deploys and stores
# the key and password as encrypted Cloudflare secrets. Nothing is saved to disk or shown on screen.

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$wrangler = 'wrangler@3.114.0'

function Read-Secret([string]$prompt) {
  $secure = Read-Host -AsSecureString $prompt
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

Write-Host ''
Write-Host 'Cover letter backend setup' -ForegroundColor Cyan
Write-Host 'Your typing is hidden. Paste each value and press Enter.'
Write-Host ''

$env:CLOUDFLARE_API_TOKEN = Read-Secret 'Cloudflare API token (Edit Cloudflare Workers)'
$anyapiKey = Read-Secret 'AnyAPI key'
$password = Read-Secret 'Choose an admin password for /admin'

if (-not $env:CLOUDFLARE_API_TOKEN -or -not $anyapiKey -or -not $password) {
  Write-Host 'All three values are required. Nothing was changed.' -ForegroundColor Red
  exit 1
}

try {
  # wrangler prints warnings on stderr; don't let PowerShell treat those as fatal
  $ErrorActionPreference = 'Continue'
  Write-Host ''
  Write-Host '1/3 Deploying...' -ForegroundColor Cyan
  $lines = npx -y $wrangler deploy 2>&1
  $lines | ForEach-Object { Write-Host $_ }
  $deployLog = $lines | Out-String
  if ($LASTEXITCODE -ne 0) { throw 'Deploy failed (see the messages above).' }

  Write-Host '2/3 Saving the AnyAPI key...' -ForegroundColor Cyan
  $anyapiKey | npx -y $wrangler secret put ANYAPI_KEY | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not save ANYAPI_KEY.' }

  Write-Host '3/3 Saving the admin password...' -ForegroundColor Cyan
  $password | npx -y $wrangler secret put ADMIN_PASSWORD | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not save ADMIN_PASSWORD.' }

  $url = ([regex]::Match($deployLog, 'https://[a-z0-9.-]+\.workers\.dev')).Value
  Write-Host ''
  Write-Host 'Done.' -ForegroundColor Green
  if ($url) {
    Write-Host 'Send this address to Claude:' -ForegroundColor Green
    Write-Host "  $url" -ForegroundColor Yellow
  } else {
    Write-Host 'Find the address in Cloudflare under Workers & Pages > cover-letters, and send it to Claude.'
  }
}
catch {
  Write-Host $_ -ForegroundColor Red
  exit 1
}
finally {
  Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
  $anyapiKey = $null; $password = $null
}
