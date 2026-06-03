/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createRequire } = require("module");
const ts = require("typescript");

const repoRoot = path.join(__dirname, "..", "..");
const srcRoot = path.join(repoRoot, "src");
const messagesPath = path.join(srcRoot, "i18n", "messages.ts");
const rawLocalesDir = path.join(srcRoot, "i18n", "locales");
const outputPath = path.join(
  repoRoot,
  "artefacts",
  "reports",
  "i18n-untranslated-remediation-report.md",
);

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SAMPLE_LIMIT = 10;

function transpileTsModule(source, filename) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      resolveJsonModule: true,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
}

function createTsSandbox(entryFile) {
  const baseDir = path.dirname(entryFile);
  const hostRequire = createRequire(entryFile);

  const compileTsModule = (filename) => {
    const src = fs.readFileSync(filename, "utf8");
    const outputText = transpileTsModule(src, filename);
    const mod = { exports: {} };
    const context = {
      exports: mod.exports,
      module: mod,
      require: sandboxRequire,
      __dirname: path.dirname(filename),
      __filename: filename,
      console,
    };
    vm.createContext(context);
    vm.runInContext(outputText, context, { filename });
    return mod.exports;
  };

  const sandboxRequire = (id) => {
    try {
      return hostRequire(id);
    } catch (error) {
      if (id.startsWith(".")) {
        const tsPath = path.resolve(baseDir, `${id}.ts`);
        if (fs.existsSync(tsPath)) {
          return compileTsModule(tsPath);
        }
      }
      throw error;
    }
  };

  return { compileTsModule };
}

function loadNormalizedMessages() {
  const source = fs.readFileSync(messagesPath, "utf8");
  const outputText = transpileTsModule(source, messagesPath);
  const { compileTsModule } = createTsSandbox(messagesPath);
  const sandbox = {
    exports: {},
    module: { exports: {} },
    require(id) {
      const hostRequire = createRequire(messagesPath);
      try {
        return hostRequire(id);
      } catch (error) {
        if (id.startsWith(".")) {
          const tsPath = path.resolve(path.dirname(messagesPath), `${id}.ts`);
          if (fs.existsSync(tsPath)) {
            return compileTsModule(tsPath);
          }
        }
        throw error;
      }
    },
    __dirname: path.dirname(messagesPath),
    __filename: messagesPath,
    console,
  };

  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  vm.runInContext(outputText, sandbox, { filename: messagesPath });

  const exported = sandbox.module.exports;
  const messages = exported?.messages;
  const supportedLanguages = exported?.supportedLanguages;

  if (!messages || typeof messages !== "object") {
    throw new Error("Failed to load messages from messages.ts");
  }
  if (!Array.isArray(supportedLanguages)) {
    throw new Error("Failed to load supportedLanguages from messages.ts");
  }

  return { messages, supportedLanguages };
}

function getNamespaces() {
  const enDir = path.join(rawLocalesDir, "en");
  return fs.readdirSync(enDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""))
    .sort((a, b) => a.localeCompare(b));
}

function loadRawLocaleBundles(supportedLanguages) {
  const bundles = {};
  const namespaces = getNamespaces();

  for (const locale of supportedLanguages) {
    const merged = {};
    for (const namespace of namespaces) {
      const filename = path.join(rawLocalesDir, locale, `${namespace}.json`);
      if (!fs.existsSync(filename)) {
        continue;
      }
      const values = JSON.parse(fs.readFileSync(filename, "utf8"));
      Object.assign(merged, values);
    }
    bundles[locale] = merged;
  }

  return bundles;
}

function walkProductionFiles(rootDir) {
  const result = [];

  function visit(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(repoRoot, fullPath);

      if (entry.isDirectory()) {
        if (entry.name === "__tests__") continue;
        if (relativePath.startsWith(`src${path.sep}i18n${path.sep}messages`)) continue;
        if (relativePath.startsWith(`src${path.sep}i18n${path.sep}locales`)) continue;
        visit(fullPath);
        continue;
      }

      if (!sourceExtensions.has(path.extname(entry.name))) continue;
      if (entry.name.includes(".test.") || entry.name.includes(".spec.")) continue;
      if (relativePath === path.join("src", "i18n", "messages.ts")) continue;
      result.push(fullPath);
    }
  }

  visit(rootDir);
  return result;
}

function collectUsageByKey(filePaths, validKeys) {
  const keySet = new Set(validKeys);
  const usage = new Map();
  const literalPattern = /["'`]([A-Za-z0-9][A-Za-z0-9_.-]*)["'`]/g;

  for (const filePath of filePaths) {
    const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
    const source = fs.readFileSync(filePath, "utf8");
    const matches = new Set();

    for (const match of source.matchAll(literalPattern)) {
      const candidate = match[1];
      if (!candidate || !candidate.includes(".")) continue;
      if (!keySet.has(candidate)) continue;
      matches.add(candidate);
    }

    for (const key of matches) {
      if (!usage.has(key)) {
        usage.set(key, []);
      }
      usage.get(key).push(relativePath);
    }
  }

  for (const files of usage.values()) {
    files.sort((a, b) => a.localeCompare(b));
  }

  return usage;
}

function buildRows({ messages, rawBundles, supportedLanguages, usageByKey }) {
  const en = messages.en;
  const keys = Object.keys(en).sort();
  const rows = [];

  for (const locale of supportedLanguages) {
    if (locale === "en") continue;
    const normalized = messages[locale] ?? {};
    const raw = rawBundles[locale] ?? {};

    for (const key of keys) {
      if (normalized[key] !== en[key]) continue;

      const hasRawEntry = Object.prototype.hasOwnProperty.call(raw, key);
      const status = hasRawEntry ? "untranslated" : "missing";
      const usageFiles = usageByKey.get(key) ?? [];

      rows.push({
        locale,
        key,
        englishSource: en[key],
        currentLocaleValue: normalized[key] ?? "",
        status,
        usageFiles,
        notes: usageFiles.length === 0 ? "No static usage found" : "",
      });
    }
  }

  return rows;
}

function summarizeRows(rows) {
  const summary = new Map();

  for (const row of rows) {
    const current = summary.get(row.locale) ?? { total: 0, untranslated: 0, missing: 0 };
    current.total += 1;
    if (row.status === "missing") {
      current.missing += 1;
    } else {
      current.untranslated += 1;
    }
    summary.set(row.locale, current);
  }

  return Array.from(summary.entries())
    .map(([locale, counts]) => ({ locale, ...counts }))
    .sort((a, b) => a.locale.localeCompare(b.locale));
}

function escapeTableCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>");
}

function formatUsageFiles(usageFiles) {
  if (!usageFiles.length) return "Not found";
  return usageFiles.map((file) => `\`${file}\``).join("<br>");
}

function renderMarkdown({ generatedOn, rows, summary, scannedFilesCount }) {
  const lines = [];
  lines.push("# i18n Untranslated Remediation Report");
  lines.push("");
  lines.push(`Generated: ${generatedOn}`);
  lines.push("Scope: Current exposed non-English locales in `src/i18n/messages.ts`");
  lines.push("Source scan: Production files under `src/` only (`__tests__`, `*.test.*`, `*.spec.*`, and locale bundle sources excluded)");
  lines.push(
    "Purpose: Canonical worklist for translating every currently untranslated string in already exposed locales.",
  );
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Locales with untranslated fallback: ${summary.length}`);
  lines.push(`- Total remediation rows: ${rows.length}`);
  lines.push(`- Production source files scanned for usage mapping: ${scannedFilesCount}`);
  lines.push("");
  lines.push("| Locale | Total | Untranslated | Missing |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const item of summary) {
    lines.push(`| ${item.locale} | ${item.total} | ${item.untranslated} | ${item.missing} |`);
  }
  lines.push("");
  lines.push("## Worklist");
  lines.push("");
  lines.push("| Locale | Key | English source | Current locale value | Status | Used in file(s) | Notes |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const row of rows) {
    lines.push(
      `| ${row.locale} | ${escapeTableCell(row.key)} | ${escapeTableCell(row.englishSource)} | ${escapeTableCell(row.currentLocaleValue)} | ${row.status} | ${formatUsageFiles(row.usageFiles)} | ${escapeTableCell(row.notes)} |`,
    );
  }
  lines.push("");
  lines.push("## Limitations");
  lines.push("");
  lines.push("- Usage mapping is static and string-literal based.");
  lines.push("- The scanner intentionally supports direct key literals such as `t(\"key\")`, `t('key')`, `formatMessageWith(..., \"key\", ...)`, and other statically declared `MessageKey`-style string literals.");
  lines.push("- Dynamically constructed keys are not resolved in v1 and may appear as `Not found` even when used indirectly.");
  lines.push("- `missing` means the raw locale file lacks the key; `untranslated` means the raw locale file contains a value exactly equal to English.");
  lines.push("");
  lines.push("## Audit Cross-Check");
  lines.push("");
  lines.push("- The untranslated-key universe in this report should match the non-English untranslated universe reported by `npm run i18n:audit`.");
  lines.push(`- Sample keys: ${rows.slice(0, SAMPLE_LIMIT).map((row) => `\`${row.locale}:${row.key}\``).join(", ")}`);
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function generateReport() {
  const { messages, supportedLanguages } = loadNormalizedMessages();
  const rawBundles = loadRawLocaleBundles(supportedLanguages);
  const filePaths = walkProductionFiles(srcRoot);
  const usageByKey = collectUsageByKey(filePaths, Object.keys(messages.en));
  const rows = buildRows({ messages, rawBundles, supportedLanguages, usageByKey })
    .sort((a, b) =>
      a.locale.localeCompare(b.locale) || a.key.localeCompare(b.key),
    );
  const summary = summarizeRows(rows);
  const generatedOn = new Date().toISOString().slice(0, 10);
  const markdown = renderMarkdown({
    generatedOn,
    rows,
    summary,
    scannedFilesCount: filePaths.length,
  });

  return {
    markdown,
    rows,
    summary,
    generatedOn,
    filePaths,
  };
}

function main() {
  const report = generateReport();
  fs.writeFileSync(outputPath, report.markdown, "utf8");
  console.log(
    `Wrote ${path.relative(repoRoot, outputPath)} with ${report.rows.length} rows across ${report.summary.length} locales.`,
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  buildRows,
  collectUsageByKey,
  generateReport,
  loadNormalizedMessages,
  loadRawLocaleBundles,
  renderMarkdown,
  summarizeRows,
  walkProductionFiles,
};
