# Agent Guidelines for Shitflix

This document provides instructions for agentic coding agents working on the Shitflix repository.

## 1. Build, Lint, and Test Commands

The project consists of a Node.js dashboard, shell scripts, and a Docker-based infrastructure.

### Dashboard (Node.js)
- **Location:** `dashboard/`
- **Install Dependencies:**
  ```bash
  npm install
  ```
- **Run Development:**
  ```bash
  node api-backend.js
  ```
  *(Note: Runs on port defined in `DASHBOARD_PORT` env var or 7069)*

- **Linting:**
  - Currently, no specific linter (like ESLint) is configured in `package.json`.
  - Agents should follow standard JavaScript best practices.

- **Testing:**
  - No automated test suite (e.g., Jest, Mocha) is currently set up in `package.json`.
  - **Manual Verification:** Start the dashboard and query endpoints (e.g., `curl http://localhost:7069/`).
  - **Script Verification:** Shell scripts in `scripts/` can be tested individually by running them with appropriate arguments, ensuring environment variables are set.

### Infrastructure (Docker)
- **Start Services:**
  ```bash
  docker-compose up -d
  ```
- **Stop Services:**
  ```bash
  docker-compose down
  ```
- **Logs:**
  ```bash
  docker-compose logs -f
  ```

### Scripts (Shell)
- **Location:** `scripts/`
- **Execution:** Scripts are generally executed by the `shitflix-runner` container or manually.
- **Key Scripts:**
  - `generate-wishlist.sh`: Fetches trending content.
  - `wishlist-processor.sh`: Processes the wishlist against trackers.
  - `shitflix-runner.sh`: Orchestrates the sync process.

## 2. Code Style & Conventions

### JavaScript (Dashboard)
- **Format:** Standard JS, no TypeScript.
- **Imports:** Use CommonJS `require()`.
- **Async/Await:** Prefer `async/await` over raw promises/callbacks for file I/O and asynchronous logic.
- **Error Handling:**
  - Wrap async route handlers in `try/catch`.
  - Log errors to `console.error`.
  - Return appropriate HTTP status codes (e.g., 500 for server errors, 400 for bad input).
- **Naming:**
  - Variables/Functions: `camelCase`.
  - Constants: `UPPER_SNAKE_CASE` (mostly for environment variables).
  - Filenames: `kebab-case` (e.g., `api-backend.js`).
- **Path Handling:** Always use `path.join()` or `path.resolve()` for file paths to ensure cross-platform compatibility (though primarily targets Linux/Docker).
- **Environment Variables:** Access via `process.env`. Provide defaults where possible (e.g., `process.env.PORT || 7069`).

### Shell Scripts
- **Shebang:** Always use `#!/bin/sh` or `#!/bin/bash`.
- **Variables:**
  - Quote variables to prevent word splitting: `"$VAR"`.
  - Use descriptive variable names: `script_dir`, `wishlist_path`.
- **Error Handling:**
  - Check exit codes where critical.
  - Ensure scripts have executable permissions (`chmod +x`).

### General
- **File Structure:**
  - `dashboard/`: Node.js web interface.
  - `scripts/`: Core logic and automation scripts.
  - `secrets/`: Sensitive data (API keys) - **NEVER COMMIT CONTENTS**.
  - `txts/`: Data files (wishlist, banlist).
- **Hardcoding:** Avoid hardcoding paths. Use relative paths derived from `__dirname` or script location.
- **HTML/Frontend:** The dashboard uses server-side string concatenation for HTML (simple implementation). Maintain this style for consistency unless a major refactor is requested.
- **Logging:** Use `console.log` for standard info and `console.error` for errors.

## 3. Specific Agent Rules

- **Read-Only First:** Always inspect files before modifying.
- **Environment:** Respect existing `.env` structure. Do not introduce new required variables without updating documentation.
- **Docker:** If modifying `docker-compose.yaml`, ensure service names and volumes align with the documented architecture.
- **Secrets:** Never log or output API keys found in `secrets/`.
- **Path Construction:** When using file tools, always resolve to absolute paths based on the project root.
