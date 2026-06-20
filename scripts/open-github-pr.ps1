# Abre GitHub Compare con la rama actual pre-rellenada para crear el PR en el navegador.
# Requisito: estar logueado en github.com en tu navegador (no hace falta gh auth).

$branch = git branch --show-current 2>$null
if (-not $branch) {
  Write-Error "No se detectó rama git."
  exit 1
}

if ($branch -eq 'main' -or $branch -eq 'master') {
  Write-Error "Creá una rama feature antes de abrir el PR (actual: $branch)."
  exit 1
}

$title = 'Reception workflows and unified UI polish'
$encodedTitle = [uri]::EscapeDataString($title)
$url = "https://github.com/ShiniTv/caribean-gym/compare/main...${branch}?expand=1&title=$encodedTitle"

Write-Host ""
Write-Host "Abriendo compare en el navegador..."
Write-Host "  Base: main"
Write-Host "  Head: $branch"
Write-Host ""
Write-Host "En GitHub:"
Write-Host "  1. Revisá los cambios"
Write-Host "  2. Clic en 'Create pull request'"
Write-Host "  3. Pegá la descripción desde docs/pr-body.md"
Write-Host ""

Start-Process $url
