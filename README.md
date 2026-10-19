# Slothdule

**Slothdule** é um planner pessoal/profissional em formato PWA, pensado inicialmente como um presente funcional e privado. O app tem como mascote um bicho-preguiça e busca organizar demandas acumuladas com calma, clareza e priorização por prazo.

O projeto será desenvolvido com apoio do Codex, sempre a partir de tarefas pequenas, documentadas e revisáveis.

## Objetivo do produto

Reduzir acúmulo de demandas, esquecimento e priorização incorreta por meio de:

- tela inicial **Hoje**;
- calendário interno;
- timeline por prazo;
- visualização de carga diária/semanal;
- tarefas com categorias, clientes, projetos/POCs e checklists;
- lembretes com notificações discretas;
- anexos por link e áudio;
- priorização inteligente por regras;
- gamificação com Folhinhas no MVP;
- loja de recompensas afetivas;
- base preparada para futuras integrações com Google Calendar, Telegram, WhatsApp e IA generativa.

## Stack

- **Frontend/PWA:** Next.js + TypeScript
- **Estilo:** Tailwind CSS
- **Backend:** FastAPI (Python) em `backend/`
- **Banco:** Postgres 17 (Docker, mesma VPS)
- **Autenticação:** email+senha com JWT em cookies httpOnly (tabela `users` própria)
- **Arquivos:** disco local servido pela API (`/files/...`, até 20 MB, mesmos mimes de antes)
- **Deploy:** `docker-compose.yml` (api + web + db) na VPS atrás do nginx local
- **Assistência de desenvolvimento:** Codex

## Requisitos

- Node.js 20.9 ou superior.
- npm 10 ou superior.
- Python 3.12+ e Docker (para o backend).

## Instalação

```bash
npm install
```

Se precisar configurar variáveis locais, copie `.env.example` para `.env.local`
e preencha apenas com valores do seu ambiente. Nunca versione o arquivo
`.env.local`.

## Como rodar

```bash
make setup   # primeira vez: npm install + venv Python + deps do backend + hooks git
make dev     # sobe db + api + web com hot reload (http://localhost:3000)
```

O `make setup` instala hooks do lefthook: ESLint com `--fix` no pre-commit e
(`typecheck` + testes frontend e backend) no pre-push. O CI roda tudo de novo
como garantia — hooks locais são burláveis com `--no-verify`.

O `make dev` usa `docker-compose.yml` + `docker-compose.dev.yml`.
Detalhes das portas e senhas locais estão no `.env` (gitignorado).

Outros atalhos (`make help` lista todos):

```bash
make test          # pytest (backend) + vitest (frontend)
make lint          # ESLint
make typecheck     # tsc --noEmit
make migrate       # alembic upgrade head no banco da stack
make db-shell      # psql no banco da stack
make backup        # dump do banco + tar dos anexos em ./backups
make down          # para a stack (mantém dados)
make clean         # para tudo e APAGA banco + arquivos
```

Para validar o projeto:

```bash
npm run lint
npm run typecheck
npm run build
```

Para executar a versão de produção após o build:

```bash
npm run start
```

## Deploy (CI/CD)

Fluxo: push na `main` → workflow **CI** (lint, typecheck, testes, build das
imagens) → workflow **Deploy** (publica no GHCR e atualiza a VPS via SSH).

As imagens vão para o GitHub Container Registry, com a visibilidade do repo:

- `ghcr.io/<owner>/slothdule:api-<sha>` e `:api-latest`
- `ghcr.io/<owner>/slothdule:web-<sha>` e `:web-latest`

Autenticação via `GITHUB_TOKEN` automático — nenhum secret de registry. O deploy
fixa as tags por sha (rollback = apontar o compose para a tag anterior).
Migrations rodam sozinhas no start do container `api`.

### Secrets (GitHub → Settings → Secrets → Actions)

| Secret | Exemplo | Uso |
|---|---|---|
| `PUBLIC_API_URL` | `https://api.seudominio.com` | embutida no build do front (`NEXT_PUBLIC_*` congela no build) |
| `SSH_HOST` / `SSH_USER` / `SSH_KEY` | `1.2.3.4` / `root` / chave privada | acesso à VPS |
| `DEPLOY_DIR` | `/opt/slothdule` | repo já clonado na VPS, branch `main` |

### Preparar a VPS (uma vez)

```bash
git clone <repo> /opt/slothdule && cd /opt/slothdule
cp .env.prod.example .env   # preencher senhas, domínios e portas
docker network create proxy-net   # rede compartilhada com o nginx da VPS (uma vez)
docker compose up -d        # db + api + web (o nginx da VPS faz o TLS e o proxy)
# backup diário (cron): 0 3 * * * /opt/slothdule/scripts/backup.sh /var/backups/slothdule
```

### Deploy manual e rollback (`make prod`)

O CI faz deploy sozinho, mas dá para atualizar (ou reverter) à mão — o
procedimento é o mesmo nos dois casos (`scripts/deploy.sh`):

```bash
export SSH_HOST=1.2.3.4 SSH_USER=root SSH_KEY_FILE=~/.ssh/slothdule-deploy
export DEPLOY_DIR=/opt/slothdule GHCR_OWNER=alana-conti
export GHCR_USER=alana-conti GHCR_TOKEN=<token-com-read-packages>

make prod                              # sobe as tags :latest
make prod API_TAG=abc1234 WEB_TAG=abc1234   # pina versão (ou faz rollback)
```

`GHCR_TOKEN` pode ser um token de acesso com permissão de leitura nos pacotes;
sem ele, o `pull` de imagens privadas falha.

### nginx na VPS (proxy + TLS centralizado)

O compose não expõe 80/443 — o nginx da VPS recebe tudo e repassa para
`127.0.0.1:3000` (front) e `127.0.0.1:8002` (API). O `client_max_body_size` é
obrigatório: o default do nginx (1 MB) barraria os anexos de até 20 MB — use
`20m`, sempre `>= MAX_UPLOAD_MB` do compose. A config de referência versionada
está em [`deploy/nginx/slothdule.conf`](deploy/nginx/slothdule.conf).

O compose conecta `api` e `web` à rede externa `proxy-net` (com os aliases
`slothdule-api:8000` e `slothdule-web:3000`) — onde o nginx da VPS já roda.
Se a rede não existir: `docker network create proxy-net`.

Se a VPS usa o **Nginx Proxy Manager** (container), este arquivo não é lido
diretamente — copie-o para `/data/nginx/custom/http.conf` dentro do container
(incluído pelo NPM e nunca sobrescrito) e recarregue
`docker exec <npm> nginx -t && nginx -s reload`. O NPM fica na rede
`proxy-net`; use os aliases `slothdule-web:3000` e `slothdule-api:8000` como
upstream e `client_max_body_size 20m` no vhost da API. Certificados: certbot
webroot + um cron de renovação (o NPM só renova certificados que ele mesmo
criou).

```nginx
server {
    listen 443 ssl;
    server_name api.seu-dominio;
    client_max_body_size 20m;
    location / {
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    server_name app.seu-dominio;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
(Certificados via certbot; ajuste as portas se `API_PORT`/`WEB_PORT` estiverem
definidas no `.env` da VPS.)

## Estrutura sugerida

```text
slothdule/
  README.md
  docs/
    01-product-requirements.md
    02-user-flows.md
    03-database-schema.md
    04-architecture.md
    05-roadmap.md
    06-codex-guidelines.md
    07-codex-task-plan.md
    08-design-system.md
    09-prompt-pack.md
    10-gamification.md
  supabase/
    migrations/
      0001_initial_schema.sql
  src/
    app/
    components/
    features/
    lib/
    types/
  tests/
```

## Documentos principais

1. [`docs/01-product-requirements.md`](docs/01-product-requirements.md) — visão do produto, personas, escopo e critérios de sucesso.
2. [`docs/02-user-flows.md`](docs/02-user-flows.md) — fluxos principais de uso.
3. [`docs/03-database-schema.md`](docs/03-database-schema.md) — modelo de dados planejado.
4. [`docs/04-architecture.md`](docs/04-architecture.md) — arquitetura técnica recomendada.
5. [`docs/05-roadmap.md`](docs/05-roadmap.md) — fases de desenvolvimento.
6. [`docs/06-codex-guidelines.md`](docs/06-codex-guidelines.md) — regras para trabalhar com Codex.
7. [`docs/07-codex-task-plan.md`](docs/07-codex-task-plan.md) — backlog inicial em tarefas executáveis.
8. [`docs/08-design-system.md`](docs/08-design-system.md) — identidade visual, tom e mascote.
9. [`docs/09-prompt-pack.md`](docs/09-prompt-pack.md) — prompts prontos para uso com Codex.
10. [`docs/10-gamification.md`](docs/10-gamification.md) — regras de Folhinhas e recompensas do MVP.

## Filosofia do produto

O Slothdule não deve ser um app que gera culpa. Ele deve funcionar como um companheiro calmo de organização:

> Uma coisa de cada vez. Com clareza, afeto e constância.
