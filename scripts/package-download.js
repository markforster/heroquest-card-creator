"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const outDir = path.join(rootDir, "out");
const artefactsDir = path.join(rootDir, "artefacts");
const miniserveDir = path.join(artefactsDir, "miniserve");
const serverDistDir = path.join(rootDir, "src-hqcc-server", "dist");
const docsReadme = path.join(rootDir, "download-bundle.README.md");
const bundleReadme = path.join(outDir, "README.md");
const packageJson = require(path.join(rootDir, "package.json"));
const version = packageJson.version || "0.0.0";
const outputZip = path.join(artefactsDir, `heroquest-card-maker.${version}.zip`);

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

  console.log("[package-download] Downloading miniserve binaries");
  execSync("node bin/download-miniserve.js", { stdio: "inherit" });

  // Copy the distribution README into the out/ folder so it lands in the zip root.
  const readmeTemplate = fs.readFileSync(docsReadme, "utf8");
  const readmeText = readmeTemplate.replace(/\{version\}/g, version);
  fs.writeFileSync(bundleReadme, readmeText, "utf8");
  console.log("[package-download] Copied bundle README into out/ as README.md");

  const pdfCmd = "npx md-to-pdf README.md";
  console.log("[package-download] Generating README.pdf");
  execSync(pdfCmd, { stdio: "inherit", cwd: outDir, shell: true });

  const serverBinaries = ["hqcc-server", "hqcc-server.exe"];
  if (fs.existsSync(serverDistDir)) {
    serverBinaries.forEach((binaryName) => {
      const source = path.join(serverDistDir, binaryName);
      if (!fs.existsSync(source)) {
        return;
      }
      const destination = path.join(outDir, binaryName);
      fs.copyFileSync(source, destination);
      console.log(`[package-download] Copied ${binaryName} into out/`);
    });
  }

  if (fs.existsSync(miniserveDir)) {
    const files = fs.readdirSync(miniserveDir);
    const bundleMiniserveDir = path.join(outDir, "miniserve");
    if (!fs.existsSync(bundleMiniserveDir)) {
      fs.mkdirSync(bundleMiniserveDir, { recursive: true });
    }
    files.forEach((file) => {
      const source = path.join(miniserveDir, file);
      if (!fs.statSync(source).isFile()) {
        return;
      }
      const destination = path.join(bundleMiniserveDir, file);
      fs.copyFileSync(source, destination);
      console.log(`[package-download] Copied ${file} into out/miniserve/`);
    });
  }

  const launchers = ["start-server.sh", "start-server.command", "start-server.bat"].map((file) =>
    path.join(rootDir, file)
  );
  launchers.forEach((source) => {
    if (!fs.existsSync(source)) {
      return;
    }
    const destination = path.join(outDir, path.basename(source));
    fs.copyFileSync(source, destination);
    console.log(`[package-download] Copied ${path.basename(source)} into out/`);
  });

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
