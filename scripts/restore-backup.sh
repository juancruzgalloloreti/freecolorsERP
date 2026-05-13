#!/usr/bin/env bash
set -euo pipefail

GPG_FILE="${1:-}"
if [ -z "$GPG_FILE" ] || [ ! -f "$GPG_FILE" ]; then
  echo "Uso: $0 <path-al-archivo.gpg>"
  echo "También requiere DATABASE_URL como variable de entorno"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL no está definida."
  echo "Ej: DATABASE_URL='postgresql://...' $0 backup.gpg"
  exit 1
fi

# Pedir passphrase si no está en entorno
GPG_PASSPHRASE="${GPG_PASSPHRASE:-}"
if [ -z "$GPG_PASSPHRASE" ]; then
  read -r -s -p "Passphrase GPG: " GPG_PASSPHRASE
  echo
fi

# Confirmación final
echo ""
echo "⚠️  ESTO VA A PISAR LA DB: ${DATABASE_URL}"
echo "   Archivo: ${GPG_FILE}"
read -r -p "   Escribí CONFIRMAR para continuar: " CONFIRM
if [ "$CONFIRM" != "CONFIRMAR" ]; then
  echo "Cancelado."
  exit 1
fi

DUMP_DIR=$(mktemp -d)
SQL_FILE="${DUMP_DIR}/backup.sql"

echo "$GPG_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 \
  --decrypt -o "$SQL_FILE" "$GPG_FILE"

echo "Restaurando..."
psql "$DATABASE_URL" < "$SQL_FILE"

rm -rf "$DUMP_DIR"
echo "✅ Restauración completa."
