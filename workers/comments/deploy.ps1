[CmdletBinding(DefaultParameterSetName = 'Deploy')]
param(
    [Parameter(Mandatory, ParameterSetName = 'Verify')]
    [ValidatePattern('\Ahttps://zhumen-comments\.[a-z0-9-]+\.workers\.dev/comments\z')]
    [string] $VerifyEndpoint,
    [Parameter(Mandatory, ParameterSetName = 'Update')]
    [switch] $UpdateWorker
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
$wrangler = (Get-Command wrangler.cmd -ErrorAction Stop).Source
$sourceConfig = Join-Path $PSScriptRoot 'wrangler.toml'
$databaseName = 'zhumen-comments'
$origin = 'https://logic61.github.io'
function Invoke-Wrangler {
    & $wrangler @args
    if ($LASTEXITCODE -ne 0) {
        throw "Wrangler failed: $($args[0..1] -join ' ') (exit $LASTEXITCODE)."
    }
}

function Get-DeploymentSecret([string] $name) {
    $value = [Environment]::GetEnvironmentVariable($name)
    if (-not $value) { $value = [Environment]::GetEnvironmentVariable($name, 'User') }
    $value
}

function Set-WorkerSecret([string] $name, [string] $value, [string] $workerConfig) {
    $value | & $wrangler secret put $name --config $workerConfig | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Failed to configure $name on the Worker." }
}

$agnesKey = Get-DeploymentSecret 'AGNES_API_KEY'
if ($UpdateWorker) {
    if (-not $agnesKey) { throw 'AGNES_API_KEY is missing from the environment.' }
    Invoke-Wrangler deploy --config $sourceConfig | Out-Host
    Set-WorkerSecret 'AGNES_API_KEY' $agnesKey $sourceConfig
    Write-Host 'Worker deployed and Agnes fallback configured.'
    return
}

function Get-CommentsDatabase {
    $json = (Invoke-Wrangler d1 list --json --config $sourceConfig) -join "`n"
    $json | ConvertFrom-Json | Where-Object { $_.name -eq $databaseName } | Select-Object -First 1
}

function New-SmokeTestBody([string] $text) {
    $payload = @{ submissionId = [guid]::NewGuid().ToString(); name = ''; body = $text; website = '' }
    return ,([Text.Encoding]::UTF8.GetBytes(($payload | ConvertTo-Json -Compress)))
}

if (-not $VerifyEndpoint) {
    $glmKey = Get-DeploymentSecret 'GLM_API_KEY'
    if (-not $glmKey -and -not $agnesKey) { throw 'A moderation provider key is required.' }
}

$database = Get-CommentsDatabase
if (-not $database -and -not $VerifyEndpoint) {
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
    $endpoint = $VerifyEndpoint
    if (-not $endpoint) {
        Invoke-Wrangler d1 migrations apply DB --remote --config $config | Out-Host
        $deployment = (Invoke-Wrangler deploy --config $config) -join "`n"
        Write-Host $deployment
        if ($deployment -notmatch 'https://zhumen-comments\.[a-z0-9-]+\.workers\.dev\b') {
            throw 'Could not determine the Worker URL.'
        }
        $endpoint = $Matches[0] + '/comments'

        if ($glmKey) { Set-WorkerSecret 'GLM_API_KEY' $glmKey $config }
        if ($agnesKey) { Set-WorkerSecret 'AGNES_API_KEY' $agnesKey $config }
    }

    $testPage = '/miwen/deployment-check-' + [guid]::NewGuid().ToString('N')
    $testUrl = $endpoint + '?page=' + [uri]::EscapeDataString($testPage)
    $headers = @{ Origin = $origin }
    $arguments = @{ Uri = $testUrl; Headers = $headers; TimeoutSec = 30; UseBasicParsing = $true }
    $postArguments = @{ Method = 'Post'; ContentType = 'application/json; charset=utf-8' }

    $allowed = New-SmokeTestBody 'How did ghost stories influence traditional festival customs?'
    $blocked = New-SmokeTestBody 'Everyone must worship this god. Join our religious sect today and make offerings to become rich and avoid disaster.'
    try {
        $published = Invoke-RestMethod @arguments @postArguments -Body $allowed
        $commentId = [long]$published.comment.id
        if ($commentId -le 0) {
            throw 'The Worker did not publish the ordinary discussion test comment.'
        }
        $visible = Invoke-RestMethod @arguments
        if ($commentId -notin @($visible.comments.id)) {
            throw 'The published comment could not be read from the Worker.'
        }

        try {
            Invoke-RestMethod @arguments @postArguments -Body $blocked | Out-Null
            throw 'Moderation unexpectedly approved the proselytizing test comment.'
        } catch {
            if (-not $_.Exception.Response -or [int]$_.Exception.Response.StatusCode -ne 422) { throw }
        }
    } finally {
        # The test thread has no corresponding public page.
        Invoke-Wrangler d1 execute DB --remote --config $config --command "UPDATE comments SET hidden = 1 WHERE page = '$testPage' AND hidden = 0;" | Out-Host
    }

    $hidden = Invoke-RestMethod @arguments
    if ($hidden.comments) {
        throw 'The hidden test comments are still visible.'
    }
    Write-Host 'Verified public read, moderation approval/rejection, and comment hiding.'
    Write-Output "PUBLIC_COMMENTS_API=$endpoint"
} finally {
    if (Test-Path -LiteralPath $config) {
        Remove-Item -LiteralPath $config -Force
    }
}
