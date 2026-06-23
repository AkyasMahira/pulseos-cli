# AGENTS.md

## Project overview

`pulseos` is a CLI installer/updater for the PulseOS VPS monitoring monorepo.  
This repo is a thin wrapper — the actual application lives at `github.com/AkyasMahira/PulseOS.git`  
and gets cloned into the user's filesystem by the `init` command.

## Commands

The CLI exposes two commands via `commander`:

- **`init`** — Clones the PulseOS monorepo, runs `npm install`, generates `.env` files  
  (root + `apps/web/.env`), creates a random `JWT_SECRET`, and runs `npm run build`.  
  The monorepo build order is **types → api → web** (driven by the monorepo's own scripts).
- **`update`** — From inside an existing PulseOS installation: backs up the SQLite DB,  
  `git stash && git pull origin main && git stash pop`, then `npm install` and `npm run build`.

## Tech stack

- **Node.js ESM** (`"type": "module"` in package.json) — use `import`, not `require`
- **No TypeScript, no tests, no linting, no CI** in this repo
- Dependencies: `commander`, `inquirer`, `chalk`, `ora`, `shelljs`, `crypto` (built-in shim)

## Architecture notes

- `index.js` is both the library entry (`"main"`) and the CLI binary (`"bin"`).  
  It starts with `#!/usr/bin/env node`.
- The `init` command writes into the user's current working directory (not a fixed path).  
  It generates a `JWT_SECRET` via `crypto.randomBytes(32)`, writes `.env` files,  
  and creates the `apps/api/data/` directory for SQLite.
- The `update` command validates it's running inside a PulseOS installation by  
  checking for `./apps/api` and `./apps/web` directories.
