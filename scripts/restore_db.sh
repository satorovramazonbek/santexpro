#!/usr/bin/env bash
# ==============================================================================
# SantexPro PostgreSQL Restore Script
# Restores database from a gzipped SQL backup file
# ==============================================================================

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "XATOLIK: Qayta tiklanadigan fayl ko‘rsatilmadi."
    echo "Foydalanish: $0 <path_to_backup.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${DB_NAME:-santexpro}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "XATOLIK: Fayl topilmadi: ${BACKUP_FILE}"
    exit 1
fi

echo "[OGOHLANTIRISH] ${DB_NAME} ma’lumotlar bazasi ${BACKUP_FILE} faylidan qayta tiklanmoqda."
read -p "Davom etishni xohlaysizmi? (ha/yo'q): " confirm
if [ "${confirm}" != "ha" ]; then
    echo "Bekor qilindi."
    exit 0
fi

gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}"

echo "[SUCCESS] Baza muvaffaqiyatli qayta tiklandi!"
