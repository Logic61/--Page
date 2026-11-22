$ErrorActionPreference = 'Stop'
$wrangler = (Get-Command wrangler.cmd -ErrorAction Stop).Source
$sourceConfig = Join-Path $PSScriptRoot 'wrangler.toml'
$databaseName = 'zhumen-comments'
$origin = 'https://logic61.github.io'
$key = [Environment]::GetEnvironmentVariable('GLM_API_KEY')
if (-not $key) {
    $key = [Environment]::GetEnvironmentVariable('GLM_API_KEY', 'User')
}
if (-not $key) {
    throw 'GLM_API_KEY is missing from the environment.'
}

function Invoke-Wrangler {
    & $wrangler @args
    if ($LASTEXITCODE -ne 0) {
        throw "Wrangler failed: $($args[0..1] -join ' ') (exit $LASTEXITCODE)."
    }
}

function Get-CommentsDatabase {
    $json = (Invoke-Wrangler d1 list --json --config $sourceConfig) -join "`n"
    $json | ConvertFrom-Json | Where-Object { $_.name -eq $databaseName } | Select-Object -First 1
}

function New-SmokeTestBody([string] $text) {
    $payload = @{ submissionId = [guid]::NewGuid().ToString(); name = ''; body = $text; website = '' }
    [Text.Encoding]::UTF8.GetBytes(($payload | ConvertTo-Json -Compress))
}

$database = Get-CommentsDatabase
if (-not $database) {
    Invoke-Wrangler d1 create $databaseName --config $sourceConfig --update-config=false | Out-Host
    $database = Get-CommentsDatabase
}
if ($database.uuid -notmatch '^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$') {
    throw 'Could not determine the D1 database ID.'
}

$config = Join-Path $PSScriptRoot ('wrangler.deploy-' + [guid]::NewGuid().ToString('N') + '.toml')
$configText = [IO.File]::ReadAllText($sourceConfig)
$databaseIdPattern = '(?m)^database_id = "[^"\r\n]+"$'
if ($configText -notmatch $databaseIdPattern) {
    throw 'Could not find the D1 binding in wrangler.toml.'
}

try {
    $configText = $configText -replace $databaseIdPattern, ('database_id = "' + $database.uuid + '"')
    [IO.File]::WriteAllText($config, $configText, [Text.UTF8Encoding]::new($false))
    Invoke-Wrangler d1 migrations apply DB --remote --config $config | Out-Host
    $deployment = (Invoke-Wrangler deploy --config $config) -join "`n"
    Write-Host $deployment
    if ($deployment -notmatch 'https://zhumen-comments\.[a-z0-9-]+\.workers\.dev\b') {
        throw 'Could not determine the Worker URL.'
    }
    $endpoint = $Matches[0] + '/comments'

    $key | & $wrangler secret put GLM_API_KEY --config $config | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to configure GLM_API_KEY on the Worker.'
    }

    $testPage = '/miwen/deployment-check-' + [guid]::NewGuid().ToString('N')
    $testUrl = $endpoint + '?page=' + [uri]::EscapeDataString($testPage)
    $headers = @{ Origin = $origin }
    $arguments = @{ Uri = $testUrl; Headers = $headers; TimeoutSec = 30; UseBasicParsing = $true }
    $postArguments = @{ Method = 'Post'; ContentType = 'application/json; charset=utf-8' }

    # Test an English example so the script works with Windows PowerShell 5's default encoding.
    $allowed = New-SmokeTestBody 'How did ghost stories influence traditional festival customs?'
    $published = Invoke-RestMethod @arguments @postArguments -Body $allowed
    $commentId = [long]$published.comment.id
    if ($commentId -le 0) {
        throw 'The Worker did not publish the ordinary discussion test comment.'
    }

    try {
        $visible = Invoke-RestMethod @arguments
        if ($commentId -notin @($visible.comments.id)) {
            throw 'The published comment could not be read from the Worker.'
        }
    } finally {
        # The test thread has no corresponding public page.
        Invoke-Wrangler d1 execute DB --remote --config $config --command "UPDATE comments SET hidden = 1 WHERE id = $commentId AND page = '$testPage';" | Out-Host
    }

    $blocked = New-SmokeTestBody 'Everyone must worship this god. Join our religious sect today and make offerings to become rich and avoid disaster.'
    try {
        Invoke-RestMethod @arguments @postArguments -Body $blocked | Out-Null
        throw 'GLM unexpectedly approved the proselytizing test comment.'
    } catch {
        if (-not $_.Exception.Response -or [int]$_.Exception.Response.StatusCode -ne 422) { throw }
    } finally {
        Invoke-Wrangler d1 execute DB --remote --config $config --command "UPDATE comments SET hidden = 1 WHERE page = '$testPage' AND hidden = 0;" | Out-Host
    }

    $hidden = Invoke-RestMethod @arguments
    if ($hidden.comments) {
        throw 'The hidden test comments are still visible.'
    }
    Write-Host "Verified public read, GLM approval/rejection, and comment hiding."
    Write-Output "PUBLIC_COMMENTS_API=$endpoint"
} finally {
    if (Test-Path -LiteralPath $config) {
        Remove-Item -LiteralPath $config -Force
    }
}
