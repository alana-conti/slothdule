---
name: connect-production
description: Connect to the Slothdule production server via SSH for debugging, log inspection, container management, or any other operation explicitly requested by the user. Use whenever the user asks to debug, inspect, restart, or operate on production.
---

# Connect to Production

## Connection

The local machine is already authorized (SSH key). SSH listens on port **45360** (port 22 is closed). Connect with:

```bash
ssh -p 45360 guivi@194.163.159.175
```

For one-off remote commands, prefer non-interactive form:

```bash
ssh -p 45360 -o ConnectTimeout=10 -o BatchMode=yes guivi@194.163.159.175 '<command>'
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
- Edge/proxy: `composes-app-1` (nginx-proxy-manager). It reaches the apps by container name over the `proxy-net` Docker network.

## Firewall

- `ufw` is enabled, and only 80, 443 and the SSH port (45360) are public. The `DOCKER-USER` chain (in `/etc/ufw/after.rules` and `after6.rules`) drops every other port that Docker publishes, so ports like 3000, 8002, 5434 or 81 are reachable only from the server itself.
- To open the NPM admin (port 81), use a tunnel: `ssh -p 45360 -L 8181:localhost:81 guivi@194.163.159.175`, then go to http://localhost:8181.
- Do not publish new services directly. Route them through the proxy, and never reinstall Portainer exposed to the internet (it was the entry point of the 2026-11 incident).

## Common Operations

```bash
# List containers and health
ssh -p 45360 guivi@194.163.159.175 'docker ps --format "table {{.Names}}\t{{.Status}}"'

# Follow web logs
ssh -p 45360 guivi@194.163.159.175 'docker logs -f --tail 100 slothdule-web-1'

# API logs
ssh -p 45360 guivi@194.163.159.175 'docker logs -f --tail 100 slothdule-api-1'

# Restart a service
ssh -p 45360 guivi@194.163.159.175 'cd ~/infra/composes && docker compose restart slothdule-web-1'

# Database psql shell
ssh -p 45360 guivi@194.163.159.175 'docker exec -it slothdule-db-1 psql -U postgres'
```

## Safety Rules

- Only run mutating operations (restart, down, migrations, file edits, database changes) when the user explicitly asked for them.
- Read-only operations (logs, status, inspect, grep) are fine for debugging without extra confirmation.
- Before destructive actions (down, volume removal, data deletion), confirm the exact scope with the user first.
