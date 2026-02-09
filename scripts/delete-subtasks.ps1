param(
  [string]$BaseUrl = 'http://localhost:3000'
)

$ErrorActionPreference = 'Stop'

# Backup tasks.json
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$src = Join-Path (Get-Location) 'data\tasks.json'
$bak = "$src.bak-$ts"
Copy-Item -Force $src $bak
Write-Host "Backup: $bak"

# Get all tasks and delete those that are subtasks (have parentId)
$all = (Invoke-RestMethod -Uri "$BaseUrl/api/tasks" -Method Get).tasks
$subs = @($all | Where-Object { $_.parentId })

Write-Host "Found subtasks: $($subs.Count)"
foreach ($t in $subs) {
  Invoke-RestMethod -Uri "$BaseUrl/api/tasks/$($t.id)" -Method Delete | Out-Null
}

Write-Host "Deleted subtasks: $($subs.Count)"
