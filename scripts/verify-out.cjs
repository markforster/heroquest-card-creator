const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const outDir = path.join(rootDir, "out");
const indexHtml = path.join(outDir, "index.html");

if (!fs.existsSync(outDir)) {
  console.error("[verify-out] out/ directory not found. Run `npm run build` first.");
  process.exit(1);
}

if (!fs.existsSync(indexHtml)) {
  console.error(
    "[verify-out] out/index.html not found. Ensure `next.config.mjs` uses `output: \"export\"` and build succeeds."
  );
  process.exit(1);
}

console.log("[verify-out] out/ looks good.");
