#!/usr/bin/env bash
# Setup project skills: installs required global skills and links ai/skills/* into ~/.agents/skills.
# Idempotent and safe to run repeatedly.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
AGENT_SKILLS_DIR="$HOME/.agents/skills"

GLOBAL_SKILLS=(
    "microsoft/playwright-cli@playwright-cli"
    "vercel-labs/agent-skills@web-design-guidelines"
    "anthropics/skills@frontend-design"
    "vercel-labs/skills@find-skills"
)

printf "Repo root: %s\n" "$REPO_ROOT"

if ! command -v node > /dev/null 2>&1 || ! command -v npx > /dev/null 2>&1; then
    printf "Error: node/npx not found. Install Node.js first.\n" >&2
    exit 1
fi

mkdir -p "$AGENT_SKILLS_DIR"

for pkg in "${GLOBAL_SKILLS[@]}"; do
    name="${pkg#*@}"
    if [ -d "$AGENT_SKILLS_DIR/$name" ]; then
        printf "OK: global skill '%s' already installed\n" "$name"
    else
        printf " Installing global skill '%s'...\n" "$name"
        npx skills add "$pkg" -g -y
    fi
done

for dir in "$REPO_ROOT"/ai/skills/*/; do
    name="$(basename "$dir")"
    target="$AGENT_SKILLS_DIR/$name"
    if [ -e "$target" ] || [ -L "$target" ]; then
        printf "OK: '%s' already present in %s\n" "$name" "$AGENT_SKILLS_DIR"
    else
        ln -s "$dir" "$target"
        printf "OK: linked project skill '%s' -> %s\n" "$name" "$target"
    fi
done

printf "Setup complete. Global skills:\n"
ls -1 "$AGENT_SKILLS_DIR"
