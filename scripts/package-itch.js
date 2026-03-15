"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const outDir = path.join(rootDir, "out");
const artefactsDir = path.join(rootDir, "artefacts");
const packageJson = require(path.join(rootDir, "package.json"));
const version = packageJson.version || "0.0.0";
const outputZip = path.join(artefactsDir, `heroquest-card-maker.${version}.itch.zip`);

function main() {
  if (!fs.existsSync(outDir)) {
    console.error("[package-itch] out/ directory not found. Run `npm run build` before packaging.");
    process.exit(1);
  }

  if (!fs.existsSync(artefactsDir)) {
    fs.mkdirSync(artefactsDir, { recursive: true });
  }

  if (fs.existsSync(outputZip)) {
    fs.unlinkSync(outputZip);
  }

  const zipCmd = `cd "${outDir}" && zip -r "${outputZip}" .`;
  console.log("[package-itch] Creating zip:", outputZip);
  execSync(zipCmd, { stdio: "inherit" });

  console.log("[package-itch] Done.");
}

main();
