#!/usr/bin/env node
// Test tooling only: loads the shared corpus through the real editor in a fresh context.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const corpusPath = path.join(
  root,
  "src/components/Cards/CardParts/__tests__/fixtures/structured-lists.json",
);
const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

async function main() {
  const { chromium } = require(process.env.HQCC_PLAYWRIGHT_MODULE || "playwright");
  const base = arg("--url", "http://127.0.0.1:3000");
  const parsed = new URL(base);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) {
    throw new Error("This runner accepts only a local development URL.");
  }
  const template = arg("--template", "Rules");
  const fit = arg("--fit", "off");
  if (!["off", "on"].includes(fit)) throw new Error("--fit must be off or on");
  const wanted = arg("--cases", "all");
  const ids = wanted === "all" ? corpus.cases.map((entry) => entry.id) : wanted.split(",");
  const selected = ids.map((id) => {
    const item = corpus.cases.find((entry) => entry.id === id);
    if (!item) throw new Error(`Unknown case ${id}`);
    return item;
  });
  const outputParent = path.resolve(arg("--output", os.tmpdir()));
  const relativeOutput = path.relative(root, outputParent);
  if (!relativeOutput.startsWith("..") && !path.isAbsolute(relativeOutput)) {
    throw new Error("Keep generated screenshots outside the repository.");
  }
  fs.mkdirSync(outputParent, { recursive: true });
  const output = fs.mkdtempSync(path.join(outputParent, "hqcc-list-ui-"));
  const viewport = { width: 1600, height: 1100 };
  const manifest = {
    mode: "exact input and unclipped marker sequence assertions; human visual review still required",
    source: path.relative(root, corpusPath),
    commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    branch: execFileSync("git", ["branch", "--show-current"], {
      cwd: root,
      encoding: "utf8",
    }).trim(),
    template,
    fit,
    viewport,
    createdAt: new Date().toISOString(),
    cases: [],
  };
  const browser = await chromium.launch({ headless: true });
  manifest.browser = browser.version();
  try {
    for (const fixture of selected) {
      const context = await browser.newContext({ viewport, locale: "en-GB", deviceScaleFactor: 1 });
      const page = await context.newPage();
      const errors = [];
      const warnings = [];
      const networkFailures = [];
      page.on("response", (response) => {
        if (response.status() >= 400) {
          const url = new URL(response.url());
          networkFailures.push({ url: url.origin + url.pathname, status: response.status() });
        }
      });
      page.on("requestfailed", (request) => {
        const url = new URL(request.url());
        networkFailures.push({
          url: url.origin + url.pathname,
          error: request.failure()?.errorText,
        });
      });
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        // Observed on the unchanged dev app before entering any fixture; retain explicitly.
        const knownThemeWarning = message
          .text()
          .startsWith("Warning: Extra attributes from the server: %s%s data-theme,style");
        if (message.type() === "error" && !knownThemeWarning) errors.push(message.text());
        if (knownThemeWarning) warnings.push(message.text());
        if (message.type() === "warning") warnings.push(message.text());
      });
      const evidence = { id: fixture.id, errors, warnings, networkFailures, capturePassed: false };
      manifest.cases.push(evidence);
      try {
        await page.goto(`${base.replace(/\/$/, "")}/#/cards`);
        await page
          .getByRole("button", { name: "Create a new card from a template", exact: true })
          .click();
        await page.getByRole("button", { name: template, exact: true }).click();
        const visibility = page.getByRole("switch", {
          name: "Toggle body text visibility",
          exact: true,
        });
        if (template === "Labelled Back") {
          await visibility.waitFor();
          if (!(await visibility.isChecked())) await visibility.click();
        }
        const field = page.locator("textarea#description");
        await field.waitFor({ state: "visible" });
        if (arg("--background", "")) {
          await page.getByRole("button", { name: "Choose image", exact: true }).click();
          const chooserReady = page.waitForEvent("filechooser");
          await page.getByRole("button", { name: "Upload", exact: true }).click();
          await (await chooserReady).setFiles(arg("--background", ""));
          await page.getByRole("button", { name: "Select", exact: true }).click();
          await page
            .getByRole("heading", { name: "Assets", exact: true })
            .waitFor({ state: "hidden" });
        }
        if (arg("--backdrop-fit", "off") === "on") {
          const backdropFit = page.getByRole("button", {
            name: "Toggle body text background fit",
            exact: true,
          });
          if ((await backdropFit.getAttribute("aria-pressed")) !== "true")
            await backdropFit.click();
        }
        const fitButton = page.getByRole("button", {
          name: "Toggle scale to fit body text",
          exact: true,
        });
        if (await fitButton.count()) {
          if (((await fitButton.getAttribute("aria-pressed")) === "true") !== (fit === "on")) {
            await fitButton.click();
          }
        } else if (fit === "on") {
          throw new Error(`${template} does not expose fit-to-bounds`);
        }
        const preview = page.getByRole("img", { name: `Preview of ${template} card`, exact: true });
        const previous = await preview.textContent();
        await field.fill(fixture.text);
        if ((await field.inputValue()) !== fixture.text)
          throw new Error("Input did not preserve corpus text");
        await page.waitForFunction(
          ({ name, previousText }) => {
            const svg = [...document.querySelectorAll('svg[role="img"]')].find(
              (node) => node.getAttribute("aria-label") === name,
            );
            return svg && svg.textContent !== previousText;
          },
          { name: `Preview of ${template} card`, previousText: previous },
        );
        await page.evaluate(() => document.fonts.ready);
        let last = "";
        let stable = 0;
        for (let attempt = 0; attempt < 30 && stable < 3; attempt += 1) {
          const markup = await preview.evaluate((node) => node.outerHTML);
          stable = markup === last ? stable + 1 : 0;
          last = markup;
          await page.waitForTimeout(150);
        }
        if (stable < 3) throw new Error("Preview did not settle");
        const stem = `${fixture.id}-${template.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-fit-${fit}`;
        evidence.url = page.url();
        evidence.title = await page.title();
        evidence.fontStatus = await page.evaluate(() => document.fonts.status);
        evidence.frameworkOverlay = await page
          .locator("nextjs-portal")
          .evaluateAll((nodes) =>
            nodes.some((node) => Boolean(node.shadowRoot?.querySelector("[data-nextjs-dialog]"))),
          );
        if (evidence.frameworkOverlay) throw new Error("Framework error overlay is visible");
        evidence.clipped = (await preview.locator('[data-overflow-warning="true"]').count()) > 0;
        evidence.markers = await preview.locator("[data-list-marker]").allTextContents();
        if (
          !evidence.clipped &&
          JSON.stringify(evidence.markers) !== JSON.stringify(fixture.expectedMarkers)
        ) {
          throw new Error(`Marker sequence mismatch: ${JSON.stringify(evidence.markers)}`);
        }
        evidence.previewText = await preview.textContent();
        evidence.screenshot = `${stem}.png`;
        evidence.viewportScreenshot = `${stem}-workspace.png`;
        evidence.visualChecks = fixture.visualChecks;
        evidence.futureChecks = fixture.futureChecks;
        fs.writeFileSync(path.join(output, `${stem}.txt`), fixture.text);
        fs.writeFileSync(path.join(output, `${stem}.svg`), last);
        fs.writeFileSync(
          path.join(output, `${stem}-accessibility.txt`),
          await page.locator("body").ariaSnapshot(),
        );
        await preview.screenshot({ path: path.join(output, evidence.screenshot) });
        await page.screenshot({ path: path.join(output, evidence.viewportScreenshot) });
        if (arg("--export", "off") === "on") {
          const downloadReady = page.waitForEvent("download");
          await page.getByRole("button", { name: "Export", exact: true }).click();
          const download = await downloadReady;
          evidence.exportFile = `${stem}-export.png`;
          await download.saveAs(path.join(output, evidence.exportFile));
          if (await download.failure()) throw new Error("PNG download failed");
        }
        if (arg("--help", "off") === "on") {
          await page.getByRole("button", { name: "Formatting help", exact: true }).click();
          await page.getByRole("heading", { name: "Lists", exact: true }).waitFor();
          evidence.helpScreenshot = `${stem}-help.png`;
          await page.screenshot({ path: path.join(output, evidence.helpScreenshot) });
        }
        evidence.capturePassed = true;
        console.log(
          `${fixture.id}: captured; clipped=${evidence.clipped}; errors=${errors.length}`,
        );
      } catch (error) {
        evidence.failure = error.message;
        console.error(`${fixture.id}: ${error.message}`);
        await page
          .screenshot({ path: path.join(output, `${fixture.id}-failure.png`) })
          .catch(() => {});
      } finally {
        await context.close();
        fs.writeFileSync(path.join(output, "manifest.json"), JSON.stringify(manifest, null, 2));
      }
    }
  } finally {
    await browser.close();
    console.log(`Evidence: ${output}`);
  }
  if (manifest.cases.some((entry) => !entry.capturePassed || entry.errors.length))
    process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
