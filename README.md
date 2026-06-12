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

## Stack recomendada

- **Frontend/PWA:** Next.js + TypeScript
- **Estilo:** Tailwind CSS
- **Backend/Banco:** Supabase/Postgres
- **Autenticação:** Supabase Auth
- **Arquivos:** Supabase Storage
- **Deploy:** Vercel
- **Repositório:** GitHub
- **Assistência de desenvolvimento:** Codex

## Requisitos

- Node.js 20.9 ou superior.
- npm 10 ou superior.

## Instalação

```bash
npm install
```

Se precisar configurar variáveis locais, copie `.env.example` para `.env.local`
e preencha apenas com valores do seu ambiente. Nunca versione o arquivo
`.env.local`.

## Como rodar

Para iniciar o ambiente de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

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
