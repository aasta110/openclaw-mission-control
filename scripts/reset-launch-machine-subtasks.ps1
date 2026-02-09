param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$ParentId = '4cbf0fe4-9630-419b-9c58-793e847883c0'
)

$ErrorActionPreference = 'Stop'

$children = (Invoke-RestMethod -Uri "$BaseUrl/api/tasks?parentId=$ParentId" -Method Get).tasks
Write-Host "Children found: $($children.Count)"

foreach ($c in $children) {
  if ($c.status -ne 'todo') {
    Invoke-RestMethod -Uri "$BaseUrl/api/tasks/$($c.id)" -Method Patch -ContentType 'application/json' -Body '{"status":"todo"}' | Out-Null
  }
}

Write-Host 'Reset complete.'
