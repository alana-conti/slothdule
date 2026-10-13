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
- **Arquivos:** disco local servido pela API (`/files/...`, 10 MB, mesmos mimes de antes)
- **Deploy:** `docker-compose.yml` (api + db + Caddy com TLS) na VPS; frontend onde preferir
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
