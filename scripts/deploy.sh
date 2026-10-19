#!/bin/sh
# Atualiza a produção com imagens do GHCR.
#
# Fonte única do procedimento de deploy — chamado pelo workflow Deploy
# (via SSH) e pelo `make prod`. Pressupõe o repo já atualizado
# (quem chama faz `git pull --ff-only` antes).
#
# Env obrigatórias: API_IMAGE, WEB_IMAGE
#   (ex.: ghcr.io/owner/slothdule:api-abc1234)
# Env opcionais: GHCR_USER / GHCR_TOKEN (login p/ pulls privados).
set -eu
cd "$(dirname "$0")/.."

if [ -n "${GHCR_TOKEN:-}" ]; then
    echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-deploy}" --password-stdin
fi
export API_IMAGE WEB_IMAGE
docker compose pull api web
docker compose up -d --no-build
# Migrations rodam sozinhas no start do container api.
set -a; [ -f .env ] && . ./.env; set +a
curl -fsS "http://localhost:${API_PORT:-8002}/health"
if [ -n "${GHCR_TOKEN:-}" ]; then
    docker logout ghcr.io
fi
echo "Deploy concluído: ${API_IMAGE} + ${WEB_IMAGE}"
