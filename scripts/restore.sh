#!/bin/sh
# Restore: ./scripts/restore.sh /var/backups/slothdule/db-YYYYMMDD-HHMMSS.dump /var/backups/slothdule/files-YYYYMMDD-HHMMSS.tar.gz
# Para antes os serviços que escrevem no banco/volume.
set -eu

DUMP="${1:?informe o arquivo db-*.dump}"
FILES="${2:?informe o arquivo files-*.tar.gz}"

docker compose stop api
docker compose exec -T db pg_restore -U "${POSTGRES_USER:-slothdule}" -d "${POSTGRES_DB:-slothdule}" --clean --if-exists < "$DUMP"
docker run --rm -v slothdule_filedata:/data -v "$(dirname "$FILES"):/in:ro" alpine sh -c "rm -rf /data/attachments && tar -xzf /in/$(basename "$FILES") -C /data"
docker compose start api

echo "Restore concluído. Rode as validações de cutover antes de liberar o acesso."
