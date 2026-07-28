# Repository Guidelines

## Project Structure & Module Organization

Slothdule is a Next.js 16 PWA written in TypeScript. Route pages and server actions live in `src/app/`; reusable UI is in `src/components/`; feature-specific UI, data access, and actions belong in `src/features/`. Keep shared domain logic in `src/lib/` and types in `src/types/`. Unit tests sit next to their modules as `*.test.ts`. Static assets are in `public/`, and database schema changes are versioned in `supabase/migrations/` (for example, `0006_add_...sql`). Product, UX, architecture, and design decisions are documented in `docs/`.

## Build, Test, and Development Commands

- `npm install` installs locked dependencies.
- `npm run dev` starts the local app at `http://localhost:3000`.
- `npm run lint` runs the Next.js ESLint configuration.
- `npm run typecheck` checks TypeScript without emitting files.
- `npm run build` creates the production build; `npm run start` serves it.
- `npx vitest run` executes the unit-test suite once. Use `npx vitest` while developing tests.

Before submitting a change, run `npm run lint`, `npm run typecheck`, and the relevant Vitest tests.

## Coding Style & Naming Conventions

Use TypeScript and four-space indentation, matching the existing source. Prefer small React components and keep business rules in focused, pure functions outside the UI where possible. Use `PascalCase` for component names, `camelCase` for functions and variables, and kebab-case filenames such as `task-status-control.tsx`. Import internal modules through the configured `@/` alias. Let ESLint guide formatting and framework-specific conventions; avoid adding dependencies or broad abstractions without a documented need.

## Testing Guidelines

Use Vitest for unit tests. Name tests after the module they cover, e.g. `src/lib/priority/priority.test.ts`, and describe observable behavior, boundary cases, and regressions. Add or update tests whenever changing priority, reward, task, or notification logic. There is no enforced coverage threshold; aim for meaningful coverage of business rules.

## Database, Configuration, and Security

Never commit `.env.local`, keys, tokens, or passwords; use `.env.example` for variable names. Preserve Supabase Row Level Security and ensure policies scope user data with `auth.uid()`. Read the relevant files in `docs/` and existing migration history before changing schema or product behavior.

## Commit & Pull Request Guidelines

Recent history is brief and does not establish a strict format; use concise Conventional Commit-style messages such as `feat: add task reminder` or `fix: handle overdue priority`. Keep commits small and reviewable. Pull requests should explain the user-visible change, link the relevant task or issue, list validation commands run, and include screenshots for UI changes. Preserve Slothdule's calm, supportive tone.
