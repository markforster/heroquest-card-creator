const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(repoRoot, "package.json");
const tauriConfigPath = path.join(repoRoot, "src-tauri", "tauri.conf.json");

const packageJsonRaw = fs.readFileSync(packageJsonPath, "utf8");
const tauriConfigRaw = fs.readFileSync(tauriConfigPath, "utf8");

const packageJson = JSON.parse(packageJsonRaw);
const tauriConfig = JSON.parse(tauriConfigRaw);

const packageVersion = packageJson.version;

if (typeof packageVersion !== "string" || packageVersion.length === 0) {
  throw new Error("package.json version is missing or invalid.");
}

if (tauriConfig.version !== packageVersion) {
  tauriConfig.version = packageVersion;
  const nextConfig = `${JSON.stringify(tauriConfig, null, 2)}\n`;
  fs.writeFileSync(tauriConfigPath, nextConfig, "utf8");
  console.log(`Updated Tauri version to ${packageVersion}.`);
} else {
  console.log(`Tauri version already ${packageVersion}.`);
}
