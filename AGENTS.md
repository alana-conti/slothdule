# Repository Guidelines

## Project Skills

Project-specific agent skills live in `ai/skills/`. Each skill is a folder with a `SKILL.md` (YAML frontmatter with `name` and `description`, plus instructions). Load the relevant skill into context before performing the task it describes; do not edit production or shared infrastructure following only general knowledge when a project skill covers it.

Skill summary:

- `ai/skills/setup-skills/` - Bootstrap the skills environment: installs required global skills via `npx skills` and links everything under `ai/skills/` into `~/.agents/skills/` so agents discover them. Idempotent `setup.sh`; run it on new machines or after adding project skills.
- `ai/skills/connect-production/` - SSH access to the Slothdule production server (`ssh guivi@194.163.159.175`) for debugging, logs, container management, and other explicitly requested operations. Includes server/container reference and safety rules.
- `ai/skills/playwright-cli/` - Browser automation and E2E testing guidance using the Playwright CLI. Local copy of the global `microsoft/playwright-cli` skill, kept in-repo for the whole team.

## Project Structure & Module Organization

Slothdule is a Next.js 16 PWA written in TypeScript. Route pages and server actions live in `src/app/`; reusable UI is in `src/components/`; feature-specific UI, data access, and actions belong in `src/features/`. Keep shared domain logic in `src/lib/` and types in `src/types/`. Unit tests sit next to their modules as `*.test.ts`. Static assets are in `public/`, and database schema changes are versioned in `supabase/migrations/` (for example, `0006_add_...sql`). Product, UX, architecture, and design decisions are documented in `docs/`.

## Build, Test, and Development Commands

- `npm install` installs locked dependencies.
- `npm run dev` starts the local app at `http://localhost:3000`.
- `npm run lint` runs the Next.js ESLint configuration.
- `npm run typecheck` checks TypeScript without emitting files.
- `npm run build` creates the production build; `npm run start` serves it.
- `npx vitest run` executes the unit-test suite once. Use `npx vitest` while developing tests.
- `make test-e2e` runs the Playwright E2E suite (`npx playwright test`) against the local docker compose stack (web :3000, API :8002); it brings the stack up first. Requires chromium (`npx playwright install chromium`). Reports live in `playwright-report/`, artifacts in `test-results/`.

Before submitting a change, run `npm run lint`, `npm run typecheck`, and the relevant Vitest tests. The `pre-push` lefthook hook runs typecheck, Vitest, backend tests and the full E2E suite.

## Coding Style & Naming Conventions

Use TypeScript and four-space indentation, matching the existing source. Prefer small React components and keep business rules in focused, pure functions outside the UI where possible. Use `PascalCase` for component names, `camelCase` for functions and variables, and kebab-case filenames such as `task-status-control.tsx`. Import internal modules through the configured `@/` alias. Let ESLint guide formatting and framework-specific conventions; avoid adding dependencies or broad abstractions without a documented need.

## Testing Guidelines

Use Vitest for unit tests. Name tests after the module they cover, e.g. `src/lib/priority/priority.test.ts`, and describe observable behavior, boundary cases, and regressions. Add or update tests whenever changing priority, reward, task, or notification logic. There is no enforced coverage threshold; aim for meaningful coverage of business rules.

Backend API tests live in `backend/tests/` (pytest + FastAPI TestClient, run with `make test-backend`). Convention: one `test_<router>.py` per module in `backend/app/routers/`, shared fixtures in `conftest.py` (`client`, `user_client`, `second_user_client`), shared HTTP builders in `helpers.py`, and cross-user isolation proof in `test_isolation.py`. Always test through HTTP (never call router functions directly); cover happy path, validation errors (400/422), 401 without session, and 404 on other users' data.

E2E tests live in `e2e/` (Playwright, run with `make test-e2e`). One file per user flow (`auth`, `today`, `quick-capture`, `task-lifecycle`), driven through the real UI and the local dev stack (no mocks). `e2e/auth.setup.ts` creates/reuses the `e2e@slothdule.dev` account and a category, saving cookies to `.playwright/.auth/user.json`; `e2e/cleanup.teardown.ts` deletes tasks titled `[e2e] ...` after the run. Add a file per new flow, keep assertions on user-visible behavior ("calm tone" copy changes should be treated as feature changes, so prefer stable role-based locators over copy text where possible), and never depend on execution order between files.

## Database, Configuration, and Security

Never commit `.env.local`, keys, tokens, or passwords; use `.env.example` for variable names. Preserve Supabase Row Level Security and ensure policies scope user data with `auth.uid()`. Read the relevant files in `docs/` and existing migration history before changing schema or product behavior.

## Commit & Push Guidelines

**Git workflow (for now): work directly on `main`.** This project does not use feature branches or pull requests at the moment. Commit and push straight to `main`; do not create branches or open PRs unless the maintainer explicitly asks. This overrides any generic "branch first" default.

Recent history is brief and does not establish a strict format; use concise Conventional Commit-style messages such as `feat: add task reminder` or `fix: handle overdue priority`. Keep commits small and reviewable, and list the validation commands you ran when reporting the change. Include screenshots for UI changes when sharing them with the maintainer. Preserve Slothdule's calm, supportive tone.

The `pre-push` hook runs typecheck, Vitest, backend tests and the full E2E suite (a few minutes). If it fails, find the cause and re-run; do not bypass it with `--no-verify`.
