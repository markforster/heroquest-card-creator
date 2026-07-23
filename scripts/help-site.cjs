const { existsSync, mkdirSync } = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const helpSiteRoot = path.join(repoRoot, "help-site");
const venvRoot = path.join(helpSiteRoot, ".venv");
const venvBinDir = process.platform === "win32" ? path.join(venvRoot, "Scripts") : path.join(venvRoot, "bin");
const pythonBin = process.platform === "win32" ? path.join(venvBinDir, "python.exe") : path.join(venvBinDir, "python");
const pipBin = process.platform === "win32" ? path.join(venvBinDir, "pip.exe") : path.join(venvBinDir, "pip");
const mkdocsBin = process.platform === "win32" ? path.join(venvBinDir, "mkdocs.exe") : path.join(venvBinDir, "mkdocs");
const requirementsFile = path.join(helpSiteRoot, "requirements.txt");
const mkdocsConfigFile = path.join(helpSiteRoot, "mkdocs.yml");
const validationScript = path.join(repoRoot, "scripts", "help-site", "validate-public-content.cjs");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function ensureVenv() {
  if (!existsSync(venvRoot)) {
    mkdirSync(venvRoot, { recursive: true });
    run("python3", ["-m", "venv", venvRoot]);
  }
}

function assertMkDocsInstalled() {
  if (!existsSync(mkdocsBin)) {
    console.error("Help-site virtual environment is missing MkDocs. Run `npm run help:setup` first.");
    process.exit(1);
  }
}

function setup() {
  ensureVenv();
  run(pipBin, ["install", "--upgrade", "pip"]);
  run(pipBin, ["install", "-r", requirementsFile]);
}

function validate() {
  run("node", [validationScript]);
}

function build() {
  assertMkDocsInstalled();
  validate();
  run(mkdocsBin, ["build", "--clean", "--strict", "--config-file", mkdocsConfigFile]);
}

function serve() {
  assertMkDocsInstalled();
  validate();
  run(mkdocsBin, ["serve", "--config-file", mkdocsConfigFile, "--dev-addr", "127.0.0.1:8001"]);
}

const command = process.argv[2];

switch (command) {
  case "setup":
    setup();
    break;
  case "validate":
    validate();
    break;
  case "build":
    build();
    break;
  case "serve":
    serve();
    break;
  default:
    console.error("Usage: node scripts/help-site.cjs <setup|validate|build|serve>");
    process.exit(1);
}
