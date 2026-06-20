# Genera un par de claves kiosk nuevas (no modifica .env automáticamente).
# Copiá ambas líneas a .env y reiniciá el servidor.

$bytes = New-Object byte[] 24
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$key = [Convert]::ToBase64String($bytes).Replace('+', 'x').Replace('/', 'y').Replace('=', '').Substring(0, 24)

Write-Host ""
Write-Host "Nueva clave kiosk (24 chars):"
Write-Host ""
Write-Host "KIOSK_API_KEY=$key"
Write-Host "VITE_KIOSK_KEY=$key"
Write-Host ""
Write-Host "Pasos:"
Write-Host "  1. Reemplazá ambas variables en .env"
Write-Host "  2. npm run dev:clean"
Write-Host "  3. Actualizá la clave en Render/Vercel si aplica"
Write-Host ""
