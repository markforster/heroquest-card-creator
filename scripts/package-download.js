"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const outDir = path.join(rootDir, "out");
const artefactsDir = path.join(rootDir, "artefacts");
const docsReadme = path.join(rootDir, "download-bundle.README.md");
const bundleReadme = path.join(outDir, "README.md");
const outputZip = path.join(artefactsDir, "heroquest-card-maker.zip");

function main() {
  if (!fs.existsSync(outDir)) {
    console.error("[package-download] out/ directory not found. Run `next export` before packaging.");
    process.exit(1);
  }

  if (!fs.existsSync(docsReadme)) {
    console.error("[package-download] download-bundle.README.md not found.");
    process.exit(1);
  }

  if (!fs.existsSync(artefactsDir)) {
    fs.mkdirSync(artefactsDir, { recursive: true });
  }

  // Copy the distribution README into the out/ folder so it lands in the zip root.
  fs.copyFileSync(docsReadme, bundleReadme);
  console.log("[package-download] Copied bundle README into out/ as README.md");

  if (fs.existsSync(outputZip)) {
    fs.unlinkSync(outputZip);
  }

  // Create the zip from the contents of out/.
  // This assumes a `zip` binary is available on the system.
  const zipCmd = `cd "${outDir}" && zip -r "${outputZip}" .`;
  console.log("[package-download] Creating zip:", outputZip);
  execSync(zipCmd, { stdio: "inherit" });

  console.log("[package-download] Done.");
}

main();
