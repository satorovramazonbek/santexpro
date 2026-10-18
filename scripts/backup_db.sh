#!/usr/bin/env bash
# ==============================================================================
# SantexPro PostgreSQL Backup Script
# Creates timestamped, gzip-compressed database dumps
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="${DB_NAME:-santexpro}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
BACKUP_FILE="${BACKUP_DIR}/santexpro_${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] PostgreSQL zaxira nusxasini olish boshlandi: ${DB_NAME} (Host: ${DB_HOST}:${DB_PORT})..."

pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"

echo "[SUCCESS] Zaxira nusxasi muvaffaqiyatli saqlandi: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# 14 kundan eski nusxalarni tozalash (Retention policy)
find "${BACKUP_DIR}" -type f -name "santexpro_*.sql.gz" -mtime +14 -exec rm -f {} \;
echo "[INFO] 14 kundan eski zaxira nusxalari tozalandi."
