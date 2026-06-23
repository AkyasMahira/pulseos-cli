# PulseOS CLI

[![npm version](https://img.shields.io/npm/v/pulseos?color=blue&label=npm)](https://www.npmjs.com/package/pulseos)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The official command-line interface for **PulseOS** — a lightweight, self-hosted
monorepo VPS monitoring solution. Automate installation, configuration, and safe
upgrades of PulseOS monitoring instances on Linux servers and VPS.

---

## Prerequisites

| Requirement | Minimum Version |
|-------------|-----------------|
| **Node.js** | ≥ 18.x          |
| **npm**     | ≥ 9.x           |
| **Git**     | any recent      |

Install Git on Debian/Ubuntu:

```bash
sudo apt install git
```

> **Note:** Root or `sudo` access may be required depending on your target
> directory permissions and whether you intend to monitor Docker containers.

---

## Installation

### Global install (recommended)

```bash
npm install -g pulseos
```

If you encounter permission errors, prefix with `sudo`:

```bash
sudo npm install -g pulseos
```

### Run without installing

```bash
npx pulseos <command>
```

---

## Command Reference

| Command            | Description                                                                  |
|--------------------|------------------------------------------------------------------------------|
| `pulseos init`     | Interactive wizard to set up a fresh PulseOS deployment.                     |
| `pulseos update`   | Pull the latest patches and rebuild — preserving your SQLite database.       |
| `pulseos --version`| Print the installed CLI version.                                             |
| `pulseos --help`   | Display usage instructions and available options.                            |

### `pulseos init`

Launches an interactive setup wizard that prompts for:

- Installation folder name (default: `pulseos-app`)
- Backend API port (default: `3001`)
- Public API URL (auto-derived from the API port)
- Astro web frontend origin (default: `http://localhost:4321`)
- Primary admin username and password

Then performs the following automatically:

1. Clone the PulseOS monorepo (`AkyasMahira/PulseOS.git`)
2. Create the SQLite database directory (`apps/api/data/`)
3. Generate a cryptographically secure 32‑byte JWT secret
4. Write the root `.env` and `apps/web/.env` files
5. Run `npm install` in the cloned repository
6. Execute a sequential production build (types → api → web)

When the wizard completes, you are ready to start the monitoring backend.

### `pulseos update`

Run **inside an existing PulseOS installation root** to safely upgrade:

1. Validate the current directory contains `apps/api` and `apps/web`
2. Create a timestamped backup of `apps/api/data/pulseos.db` under `./backups/`
3. Stash any local changes, pull `origin main`, then re‑apply the stash
4. Synchronize dependencies (`npm install`)
5. Rebuild the monorepo (`npm run build`)

Restart your backend process or PM2 instance afterwards to apply the changes.

---

## Post‑Installation — Production Deployment

To keep the monitoring backend running persistently, use **PM2**:

```bash
cd pulseos-app
npm install -g pm2
pm2 start apps/api/dist/index.js --name "pulseos-backend"
```

Useful PM2 commands:

```bash
pm2 status              # view running processes
pm2 logs pulseos-backend # tail application logs
pm2 save                # save the process list for resurrection
pm2 startup             # auto‑start PM2 on system boot
```

---

## Authors

**Akyas Mahira** — [@AkyasMahira](https://github.com/AkyasMahira)

---

## License

[MIT](https://opensource.org/licenses/MIT)
