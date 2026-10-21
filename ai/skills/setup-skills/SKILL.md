---
name: setup-skills
description: Bootstrap a machine or environment so project skills in `ai/skills/` work everywhere. Installs the required global skills ecosystem (via `npx skills`) and links project skills into the agent's global skills directory. Run whenever development starts on a new machine, a global skill is missing, or a new project skill was added and is not being picked up.
---

# Setup Skills

Installs everything needed to use the project skills in `ai/skills/`.

## What the script does

Run `bash ai/skills/setup-skills/setup.sh` from the repo root (or anywhere; it resolves paths from its own location). It is idempotent and safe to run repeatedly:

1. Verifies `node`/`npx` are available (they are prerequisites for the skills CLI and this project).
2. Installs the global skills the project relies on, skipping any already present in `~/.agents/skills/`:
   - `microsoft/playwright-cli@playwright-cli`
   - `vercel-labs/agent-skills@web-design-guidelines`
   - `anthropics/skills@frontend-design`
   - `vercel-labs/skills@find-skills`
3. Links every project skill from `ai/skills/` into `~/.agents/skills/` via symlink, so the agent discovers them globally and they stay in sync with the repo automatically. Existing entries are never overwritten.
4. If a global skill installation fails, retries are safe; check https://skills.sh/<owner>/<repo> for the skill page if a package name drifts.

## Constants

The required global skills list lives in `setup.sh` under `GLOBAL_SKILLS`. When the team decides another global skill is required for this project, add it there (format `<owner>/<repo>@<skill>`).

## Verification

After running:

```bash
ls ~/.agents/skills
```

Every project skill in `ai/skills/` (including `connect-production`, `playwright-cli`, `setup-skills`) should appear as a symlink, and the four global skills above as real directories. Missing entries mean the agent session needs a restart to pick them up.
