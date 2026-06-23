#!/usr/bin/env node

import { program } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import shell from "shelljs";
import fs from "fs";
import path from "path";
import crypto from "crypto";

program
  .version("1.0.1") // Naik ke patch 1.0.1 untuk kompatibilitas sudo
  .description("PulseOS Automation Infrastructure Management");

const generateJwtSecret = () => crypto.randomBytes(32).toString("hex");

program
  .command("init")
  .description("Install and setup a new PulseOS instance on this server")
  .action(async () => {
    console.log(
      chalk.cyan.bold(
        "\n⚡ Welcome to PulseOS Automation Installer v1.0.1 ⚡\n",
      ),
    );

    // 1. Interactive Questionnaire
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "folderName",
        message: "Enter installation folder name:",
        default: "pulseos-app",
      },
      {
        type: "input",
        name: "apiPort",
        message: "Specify Backend API Port:",
        default: "3001",
      },
      {
        type: "input",
        name: "publicApiUrl",
        message: "Enter Public API URL (Required by Frontend Web):",
        default: (ans) => `http://localhost:${ans.apiPort}`,
      },
      {
        type: "input",
        name: "webOrigin",
        message: "Enter Web Origin (URL of Frontend Astro):",
        default: "http://localhost:4321",
      },
      {
        type: "input",
        name: "adminUser",
        message: "Create Primary Admin Username:",
        default: "admin",
      },
      {
        type: "input",
        name: "adminPass",
        message: "Create Primary Admin Password:",
        default: "changeme",
      },
    ]);

    const targetPath = path.join(process.cwd(), answers.folderName);

    // 2. Git Clone Core Repository
    const cloneSpinner = ora(
      "Downloading PulseOS source code from GitHub...",
    ).start();
    const repoUrl = "https://github.com/AkyasMahira/PulseOS.git";

    if (
      shell.exec(`git clone ${repoUrl} "${targetPath}"`, { silent: true })
        .code !== 0
    ) {
      cloneSpinner.fail(
        chalk.red(
          "Failed to clone repository. Please make sure Git is installed on your VPS.",
        ),
      );
      process.exit(1);
    }
    cloneSpinner.succeed(chalk.green("Source code downloaded successfully."));

    // Pindah ke direktori project hasil clone sebelum manipulasi file & npm
    shell.cd(targetPath);

    // 3. Configure Environment Variables & Data Structure (Ditarik ke atas)
    const configSpinner = ora(
      "Configuring environment variables & data structure...",
    ).start();

    const dbDir = path.join(targetPath, "apps/api/data");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const jwtSecret = generateJwtSecret();
    const rootEnvContent = `PORT=${answers.apiPort}
HOST=0.0.0.0
JWT_SECRET=${jwtSecret}
WEB_ORIGIN=${answers.webOrigin}
ADMIN_USER=${answers.adminUser}
ADMIN_PASS=${answers.adminPass}
COLLECT_INTERVAL_MS=5000
WATCH_SERVICES=nginx,ssh,cron
WATCH_PM2=true
HISTORY_RETENTION_DAYS=30
DOCKER_SOCKET=/var/run/docker.sock
STATUS_PAGE_TITLE="System Status"
STATUS_PAGE_DESC="Real-time service operational status"
DB_PATH=apps/api/data/pulseos.db
`;
    fs.writeFileSync(path.join(targetPath, ".env"), rootEnvContent);

    const webEnvContent = `PUBLIC_API_URL=${answers.publicApiUrl}\n`;
    fs.writeFileSync(path.join(targetPath, "apps/web/.env"), webEnvContent);

    configSpinner.succeed(
      chalk.green(".env configuration and SQLite folder are ready."),
    );

    // 4. Install Monorepo Dependencies (Ditambahkan flag --allow-root)
    const installSpinner = ora(
      "Installing dependencies (npm install)...",
    ).start();
    if (shell.exec("npm install --allow-root", { silent: true }).code !== 0) {
      installSpinner.fail(chalk.red("Failed to install npm dependencies."));
      process.exit(1);
    }
    installSpinner.succeed(
      chalk.green("All dependencies installed successfully."),
    );

    // 5. Build Monorepo (Ditambahkan flag --allow-root)
    const buildSpinner = ora(
      "Running sequential production build (types ➜ api ➜ web)...",
    ).start();
    if (shell.exec("npm run build --allow-root", { silent: true }).code !== 0) {
      buildSpinner.fail(
        chalk.red(
          "Production build process failed. Please check your node environment.",
        ),
      );
      process.exit(1);
    }
    buildSpinner.succeed(
      chalk.green("Monorepo compilation completed successfully."),
    );

    console.log(chalk.green.bold("\n🎉 PulseOS Installed Successfully!"));
    console.log(`\nPlease navigate to the application directory to start:`);
    console.log(chalk.cyan(`  cd ${answers.folderName}`));
    console.log(chalk.cyan(`  npm run start`));
    console.log(
      chalk.gray(
        "\n*Note: The SQLite database will auto-migrate upon initial application boot.",
      ),
    );
  });

program
  .command("update")
  .description(
    "Pull the latest update patch without losing SQLite database data",
  )
  .action(async () => {
    console.log(chalk.yellow.bold("\n🔄 Starting PulseOS Update Process...\n"));

    if (!fs.existsSync("./apps/api") || !fs.existsSync("./apps/web")) {
      console.log(
        chalk.red(
          "❌ Error: Please run this command inside the root folder of your PulseOS installation!",
        ),
      );
      process.exit(1);
    }

    // 1. Secure SQLite Database (Backup)
    const backupSpinner = ora("Securing SQLite database (Backup)...").start();
    const dbFile = "./apps/api/data/pulseos.db";
    if (fs.existsSync(dbFile)) {
      const backupDir = "./backups";
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
      fs.copyFileSync(
        dbFile,
        path.join(backupDir, `pulseos_bak_${Date.now()}.db`),
      );
      backupSpinner.succeed(chalk.green("Database backed up securely."));
    } else {
      backupSpinner.info(
        chalk.gray("Database file not found yet, skipping backup process."),
      );
    }

    // 2. Execute Git Pull with Stash Safe-Guard
    const gitSpinner = ora("Pulling latest source-code from GitHub...").start();
    shell.exec("git stash", { silent: true });
    if (shell.exec("git pull origin main", { silent: true }).code !== 0) {
      gitSpinner.fail(chalk.red("Failed to perform git pull."));
      process.exit(1);
    }
    shell.exec("git stash pop", { silent: true });
    gitSpinner.succeed(chalk.green("Source code updated successfully."));

    // 3. Synchronize Dependencies (Ditambahkan flag --allow-root)
    const updateDepsSpinner = ora("Synchronizing new dependencies...").start();
    shell.exec("npm install --allow-root", { silent: true });
    updateDepsSpinner.succeed(chalk.green("Dependencies synchronized."));

    // 4. Rebuild Project Monorepo (Ditambahkan flag --allow-root)
    const rebuildSpinner = ora(
      "Rebuilding production structure (Build)...",
    ).start();
    if (shell.exec("npm run build --allow-root", { silent: true }).code !== 0) {
      rebuildSpinner.fail(chalk.red("Failed to rebuild production build."));
      process.exit(1);
    }
    rebuildSpinner.succeed(chalk.green("Rebuild completed successfully."));

    console.log(
      chalk.green.bold(
        "\n✨ PulseOS successfully updated to the latest patch!",
      ),
    );
    console.log(
      "Please restart your backend process or PM2 instance to apply the changes.",
    );
  });

program.parse(process.argv);