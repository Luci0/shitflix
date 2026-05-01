# Agent Guidelines for Shitflix

## 🚨 Critical Context
- **Environment:** Primarily designed to run within Docker. Many paths are absolute and assume a `/shitflix` mount point (e.g., `/shitflix/scripts/...`).
- **Tooling:** Shell scripts in `scripts/` heavily rely on `jq` for JSON processing.
- **Secrets:** API keys are stored in `./secrets/*.txt`. In Docker, they are mounted via Docker secrets (e.g., `/run/secrets/tmdb-api-key`).
- **Data Stores:**
  - Wishlist/Banlist: `scripts/txts/wishlist.txt` and `scripts/txts/banlist.txt`.
  - Downloads: Configured via `DOWNLOADS_DIR` in `.env`.

## 🛠 Commands

### Dashboard (Node.js)
- **Location:** `dashboard/`
- **Install:** `npm install` (inside `dashboard/`)
- **Run Dev:** `node api-backend.js` (inside `dashboard/`)
- **Port:** `DASHBOARD_PORT` (default: `7069`)

### Infrastructure (Docker)
- **Up:** `docker-compose up -d`
- **Down:** `docker-compose down`
- **Logs:** `docker-compose logs -f`

### Scripts (Shell)
- **Location:** `scripts/`
- **Main Orchestrator:** `shitflix-runner.sh` (runs nightly sync)
- **Key Scripts:**
  - `generate-wishlist.sh`: Fetches trending content via `tmdb.sh`.
  - `wishlist-processor.sh`: Processes wishlist against trackers.

## 💻 Code Style & Conventions

### JavaScript (Dashboard)
- **Format:** Standard JS, CommonJS (`require`).
- **Async:** Prefer `async/await`.
- **Errors:** Wrap async handlers in `try/catch`; log to `console.error`.
- **HTML:** Uses server-side string concatenation for simplicity.

### Shell Scripts
- **Shebang:** `#!/bin/sh` or `#!/bin/bash`.
- **Variables:** Always quote: `"$VAR"`.
- **Paths:** Use `realpath "$(dirname -- "$0")"` to resolve script directories.

## 🛡 Rules
- **Secrets:** NEVER log or output contents of `secrets/`.
- **Paths:** When working locally, resolve paths relative to the repo root. When writing code for the container, respect the `/shitflix` prefix.
- **Read-Only:** Always inspect files before modification.
