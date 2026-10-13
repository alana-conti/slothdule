#!/bin/sh
# Backup diário: dump Postgres + snapshot dos anexos.
# Uso: ./scripts/backup.sh /caminho/para/backups
# Recomendado: cron diário na VPS. Ex.: 0 3 * * * /opt/slothdule/scripts/backup.sh /var/backups/slothdule
set -eu

DEST="${1:?informe o diretório de destino}"
DATE="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"

docker compose exec -T db pg_dump -U "${POSTGRES_USER:-slothdule}" -Fc "${POSTGRES_DB:-slothdule}" > "$DEST/db-$DATE.dump"
docker run --rm -v slothdule_filedata:/data:ro -v "$DEST:/out" alpine tar -czf "/out/files-$DATE.tar.gz" -C /data attachments

# Mantém os últimos 14 backups de cada tipo.
ls -t "$DEST"/db-*.dump | tail -n +15 | xargs -r rm --
ls -t "$DEST"/files-*.tar.gz | tail -n +15 | xargs -r rm --

echo "Backup concluído em $DEST (db-$DATE.dump, files-$DATE.tar.gz)"
