#!/usr/bin/env bash
# Nightly database backup. Add to crontab on the server:
#   30 2 * * * /home/ubuntu/lco-desk-backend/scripts/backup_db.sh >> /home/ubuntu/backup.log 2>&1
# Then copy ./backups to cloud storage (e.g. with rclone) — a backup on the same server is not enough.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M)
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "backups/lcodesk-$STAMP.dump"
find backups -name 'lcodesk-*.dump' -mtime +14 -delete
echo "backup ok: backups/lcodesk-$STAMP.dump"
