$ErrorActionPreference = "Stop"

# Configuracion segura por variables de entorno.
$REQUIRED_ENV_VARS = @(
  "DATABASE_URL",
  "GPG_PASSPHRASE",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID"
)

$MISSING_ENV_VARS = $REQUIRED_ENV_VARS | Where-Object { [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_)) }
if ($MISSING_ENV_VARS.Count -gt 0) {
  throw "Faltan variables de entorno requeridas para backup: $($MISSING_ENV_VARS -join ', ')"
}

$DATABASE_URL   = $env:DATABASE_URL
$GPG_PASSPHRASE = $env:GPG_PASSPHRASE
$BOT_TOKEN      = $env:TELEGRAM_BOT_TOKEN
$CHAT_ID        = $env:TELEGRAM_CHAT_ID

$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmm"
$DUMP_FILE = "$env:TEMP\backup_$TIMESTAMP.sql"
$GPG_FILE  = "$DUMP_FILE.gpg"

Write-Host "Generando backup..."
& pg_dump $DATABASE_URL --no-owner --no-acl -f $DUMP_FILE

Write-Host "Cifrando con GPG..."
& gpg --batch --yes --passphrase $GPG_PASSPHRASE `
      --symmetric --cipher-algo AES256 `
      --output $GPG_FILE $DUMP_FILE
Remove-Item $DUMP_FILE

Write-Host "Enviando a Telegram..."
$SIZE = [math]::Round((Get-Item $GPG_FILE).Length / 1KB)
$DATE = Get-Date -Format "dd/MM/yyyy HH:mm"
$CAPTION = "Backup FreeColors | $DATE | ${SIZE}KB | AES256"

curl.exe -s `
  -F "chat_id=$CHAT_ID" `
  -F "document=@$GPG_FILE" `
  -F "caption=$CAPTION" `
  "https://api.telegram.org/bot$BOT_TOKEN/sendDocument"

Remove-Item $GPG_FILE
Write-Host "Backup completado: $DATE"
