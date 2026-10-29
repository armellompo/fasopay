#!/bin/sh
# Daily PostgreSQL backup for FasoPay. Payroll records must be kept for years: copy these files
# off the server too (e.g. rclone to object storage), or a lost disk loses the history.
#
# Install on the server:   chmod +x deploy/backup.sh
#                          crontab -e   →   0 2 * * * /opt/fasopay/deploy/backup.sh >> /var/log/fasopay-backup.log 2>&1
# Restore (stops nothing; replaces the data):
#   docker compose exec -T db pg_restore -U fasopay -d fasopay --clean --if-exists < backups/fasopay_YYYY-MM-DD_HHMM.dump
set -eu

cd "$(dirname "$0")/.."
mkdir -p backups
stamp=$(date +%Y-%m-%d_%H%M)
file="backups/fasopay_${stamp}.dump"

docker compose exec -T db pg_dump -U fasopay -d fasopay --format=custom > "$file.partial"
mv "$file.partial" "$file"
echo "$(date -Is) backup written: $file ($(du -h "$file" | cut -f1))"

# Keep 30 days locally.
find backups -name 'fasopay_*.dump' -mtime +30 -delete
