---
name: connect-production
description: Connect to the Slothdule production server via SSH for debugging, log inspection, container management, or any other operation explicitly requested by the user. Use whenever the user asks to debug, inspect, restart, or operate on production.
---

# Connect to Production

## Connection

The local machine is already authorized (SSH key). Connect with:

```bash
ssh guivi@194.163.159.175
```

For one-off remote commands, prefer non-interactive form:

```bash
ssh -o ConnectTimeout=10 -o BatchMode=yes guivi@194.163.159.175 '<command>'
```

## Server Reference

- Ubuntu 24.04 Linux host (`vmi3304667`), x86_64
- User home contains: `~/infra/` (compose stacks), `~/repos/` (cloned repos)

## Slothdule Stack (Docker Compose)

- Compose file: `~/infra/composes/docker-compose.yaml`
- Containers:
  - `slothdule-web-1` — Next.js web app (ghcr.io/alana-conti/slothdule:web-*)
  - `slothdule-api-1` — API (ghcr.io/alana-conti/slothdule:api-*)
  - `slothdule-db-1` — postgres:17-alpine
  - `slothdule-test-postgres` — postgres:17-alpine (test database)
- Edge/proxy: `composes-app-1` (nginx-proxy-manager) and `portainer`

## Common Operations

```bash
# List containers and health
ssh guivi@194.163.159.175 'docker ps --format "table {{.Names}}\t{{.Status}}"'

# Follow web logs
ssh guivi@194.163.159.175 'docker logs -f --tail 100 slothdule-web-1'

# API logs
ssh guivi@194.163.159.175 'docker logs -f --tail 100 slothdule-api-1'

# Restart a service
ssh guivi@194.163.159.175 'cd ~/infra/composes && docker compose restart slothdule-web-1'

# Database psql shell
ssh guivi@194.163.159.175 'docker exec -it slothdule-db-1 psql -U postgres'
```

## Safety Rules

- Only run mutating operations (restart, down, migrations, file edits, database changes) when the user explicitly asked for them.
- Read-only operations (logs, status, inspect, grep) are fine for debugging without extra confirmation.
- Before destructive actions (down, volume removal, data deletion), confirm the exact scope with the user first.
