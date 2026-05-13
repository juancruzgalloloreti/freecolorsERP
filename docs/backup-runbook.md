# Backup automático — FreeColors ERP

Sistema de backup diario cifrado vía GitHub Actions + Telegram.

## Configuración inicial

### 1. Crear bot de Telegram

1. En Telegram, buscar `@BotFather` e iniciar chat.
2. Enviar: `/newbot`
3. Nombre: ej. `FreeColors Backup`
4. Username: ej. `freecolors_backup_bot`
5. Copiar el token que BotFather devuelve (ej. `123456:ABC-DEF1234...`).

### 2. Obtener el CHAT_ID del canal

1. Telegram → Nuevo canal → Privado (ej. nombre "backups-freecolors").
2. Agregar el bot como **administrador** del canal.
3. Enviar cualquier mensaje al canal (ej. "hola").
4. Abrir en el navegador:
   ```
   https://api.telegram.org/bot<TU_TOKEN>/getUpdates
   ```
5. Buscar `"chat":{"id":-100...}`. Ese número negativo (ej. `-1001234567890`) es el `CHAT_ID`.

### 3. Configurar secrets en GitHub

Ir a: GitHub → Repo → Settings → Secrets and variables → Actions → New repository secret.

| Secret | Valor | Ejemplo |
|--------|-------|---------|
| `DATABASE_URL` | Connection string de Supabase | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres?sslmode=require` |
| `TELEGRAM_BOT_TOKEN` | Token de BotFather | `123456:ABC-DEF1234...` |
| `TELEGRAM_CHAT_ID` | ID del canal privado | `-1001234567890` |
| `GPG_PASSPHRASE` | Frase secreta para cifrar backups | `fr4s3-sup3r-s3cr3t4!` |

> La `GPG_PASSPHRASE` se usa para cifrado AES256 simétrico. Sin ella no se puede descifrar un backup. Guardala en un gestor de contraseñas.

## Verificar que el backup funciona

1. Ir a GitHub → Repo → Actions → "Backup DB diario".
2. Click en "Run workflow" → "Run workflow" (ejecución manual).
3. Esperar ~1 minuto.
4. En el canal de Telegram debería aparecer un mensaje ✅ con el archivo `.gpg` adjunto.
5. Si falla, aparece un mensaje ❌ con el link al run de GitHub Actions.

## Cómo descargar y restaurar un backup en emergencia

```bash
# 1. Desde el canal de Telegram, descargar el archivo .gpg
#    (app móvil → tocar archivo → guardar, o web → descargar)

# 2. En la máquina donde se va a restaurar:
cd scripts
chmod +x restore-backup.sh

# 3. Ejecutar con la DB de destino:
DATABASE_URL='postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres?sslmode=require' \
  ./restore-backup.sh ~/Downloads/backup_20260513_0300.sql.gz.gpg

# 4. Ingresar la passphrase GPG cuando la pida
# 5. Escribir CONFIRMAR para ejecutar la restauración
```

## Cómo testear el workflow manualmente desde GitHub

1. GitHub → Repo → Actions → "Backup DB diario".
2. Botón "Run workflow" (dropdown).
3. Dejar la rama como `main` y click en "Run workflow".
4. Esperar a que el workflow termine (~30-60s).
5. Verificar el mensaje en Telegram.

## Resolución de problemas

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| El workflow falla con `pg_dump: command not found` | No se instaló postgresql-client | Verificar que el paso `apt-get install` no falle |
| El mensaje no llega a Telegram | BOT_TOKEN o CHAT_ID incorrecto | Verificar secrets en GitHub |
| `GPG: decryption failed: bad decrypt` | Passphrase incorrecta | Verificar GPG_PASSPHRASE |
| `psql: FATAL: password authentication failed` | DATABASE_URL incorrecta o rotada | Verificar el connection string en Supabase dashboard |

## Notas técnicas

- El backup corre a las **3am Argentina (6am UTC)** vía `schedule`.
- Se puede ejecutar **en cualquier momento** desde la UI de GitHub Actions.
- El archivo `.sql.gz` sin cifrar se elimina **inmediatamente** después de cifrar con GPG.
- El runner `ubuntu-latest` no persiste datos entre ejecuciones.
- No se requieren servicios de pago ni tarjeta de crédito.
