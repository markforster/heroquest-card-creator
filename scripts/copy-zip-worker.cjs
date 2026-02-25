"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const sourceFile = path.join(
  rootDir,
  "node_modules",
  "@zip.js",
  "zip.js",
  "dist",
  "zip-web-worker.js",
);
const targetDir = path.join(rootDir, "public", "zip");
const targetFile = path.join(targetDir, "zip-web-worker.js");

if (!fs.existsSync(sourceFile)) {
  throw new Error(
    `[copy-zip-worker] Missing ${sourceFile}. Did you install @zip.js/zip.js?`,
  );
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourceFile, targetFile);
console.log("[copy-zip-worker] Copied", path.relative(rootDir, targetFile));
