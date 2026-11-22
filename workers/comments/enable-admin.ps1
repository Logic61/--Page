param([switch] $RotateKey)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
$wrangler = (Get-Command wrangler.cmd -ErrorAction Stop).Source
$config = Join-Path $PSScriptRoot 'wrangler.toml'

& $wrangler deploy --config $config
if ($LASTEXITCODE -ne 0) { throw 'Worker deployment failed.' }

$secrets = (& $wrangler secret list --format json --config $config) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Could not check the existing Worker secrets.' }
$names = @($secrets | ConvertFrom-Json | ForEach-Object { $_.name })

if ($RotateKey -or 'COMMENTS_ADMIN_KEY' -notin $names) {
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = [byte[]]::new(32)
    try { $random.GetBytes($bytes) } finally { $random.Dispose() }
    $adminKey = [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
    try {
        $adminKey | & $wrangler secret put COMMENTS_ADMIN_KEY --config $config
        if ($LASTEXITCODE -ne 0) { throw 'Could not configure COMMENTS_ADMIN_KEY.' }
        Set-Clipboard -Value $adminKey
        Write-Host 'The new admin key is on your clipboard. Save it in your password manager.'
    } finally {
        Remove-Variable adminKey
    }
} else {
    Write-Host 'The existing admin key is still active. Use -RotateKey if you need to replace it.'
}

Write-Output 'ADMIN_URL=https://zhumen-comments.logic-dreemurr.workers.dev/admin'
