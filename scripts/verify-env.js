/* Simple env validation without external deps.
 * Loads env from .env files (if not already in process.env),
 * then validates required public vars used by build/static export.
 */
const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const cwd = process.cwd();
const nodeEnv = process.env.NODE_ENV || "development";
const filesToLoad = [`.env.${nodeEnv}`, ".env.local", ".env"].map((f) => path.join(cwd, f));
filesToLoad.forEach(loadEnvFile);

const url = process.env.NEXT_PUBLIC_SITE_URL;
if (!url || /localhost/.test(url)) {
  console.error(
    `Missing or invalid NEXT_PUBLIC_SITE_URL. Set it in the environment or in one of: ${filesToLoad
      .map((f) => path.basename(f))
      .join(", ")}. Value must be a non-localhost URL (e.g., https://heroquest-card-maker.example).`,
  );
  process.exit(1);
}

// All good
console.log(`Verified NEXT_PUBLIC_SITE_URL=${url}`);
