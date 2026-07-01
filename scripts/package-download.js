"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const matter = require("gray-matter");
const { marked } = require("marked");

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
const readmePdf = path.join(outDir, "README.pdf");

function buildReadmeHtml(markdownSource) {
  const { content } = matter(markdownSource);
  const bodyHtml = marked.parse(content, { gfm: true, breaks: true });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HeroQuest Card Creator Download Bundle</title>
    <style>
      :root {
        color-scheme: light;
        --text: #1f2937;
        --muted: #4b5563;
        --border: #d1d5db;
        --surface: #ffffff;
        --surface-alt: #f8fafc;
        --accent: #7c2d12;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 11pt;
        line-height: 1.55;
        color: var(--text);
        background: var(--surface);
      }

      main {
        max-width: 760px;
        margin: 0 auto;
        padding: 28pt 32pt 40pt;
      }

      h1, h2, h3 {
        line-height: 1.2;
        color: #111827;
        margin: 0 0 10pt;
      }

      h1 {
        font-size: 22pt;
        margin-bottom: 18pt;
      }

      h2 {
        font-size: 15pt;
        margin-top: 22pt;
      }

      h3 {
        font-size: 12pt;
        margin-top: 16pt;
      }

      p, ul, ol {
        margin: 0 0 11pt;
      }

      ul, ol {
        padding-left: 18pt;
      }

      li + li {
        margin-top: 4pt;
      }

      hr {
        border: 0;
        border-top: 1px solid var(--border);
        margin: 18pt 0;
      }

      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.92em;
        padding: 1pt 4pt;
        border-radius: 4px;
        background: var(--surface-alt);
      }

      pre {
        overflow: hidden;
        padding: 10pt 12pt;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface-alt);
      }

      pre code {
        padding: 0;
        background: transparent;
      }

      a {
        color: var(--accent);
        text-decoration: none;
      }

      strong {
        color: #111827;
      }

      blockquote {
        margin: 0 0 14pt;
        padding: 0 0 0 12pt;
        border-left: 3px solid var(--border);
        color: var(--muted);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 14pt;
      }

      th, td {
        border: 1px solid var(--border);
        padding: 8pt 10pt;
        text-align: left;
        vertical-align: top;
      }

      th {
        background: var(--surface-alt);
      }
    </style>
  </head>
  <body>
    <main>${bodyHtml}</main>
  </body>
</html>`;
}

async function generateReadmePdf(markdownSource, outputPath) {
  const puppeteerModule = await import("puppeteer");
  const puppeteer = puppeteerModule.default ?? puppeteerModule;
  const html = buildReadmeHtml(markdownSource);
  const browser = await puppeteer.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "14mm",
        right: "12mm",
        bottom: "14mm",
        left: "12mm",
      },
    });
  } finally {
    await browser.close();
  }
}

async function main() {
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

  console.log("[package-download] Generating README.pdf");
  await generateReadmePdf(readmeText, readmePdf);

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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
