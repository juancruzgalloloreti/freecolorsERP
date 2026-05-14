$ErrorActionPreference = "Stop"

# ── Configuración ─────────────────────────────────────────────
$DATABASE_URL    = "postgresql://postgres.lqtosckcprprnsnagksv:OCduzxTK767HpVVo@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
$GPG_PASSPHRASE  = "freecolors-erp-backup-2026!"
$BOT_TOKEN       = "8769030183:AAG2ArGkl98R0MpfOCa0Mvtl89wfJZSfu0g"
$CHAT_ID         = "-1003937100365"
# ──────────────────────────────────────────────────────────────

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