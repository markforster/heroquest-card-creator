/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createRequire } = require("module");
const ts = require("typescript");

const repoRoot = path.join(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");
const messagesPath = path.join(srcRoot, "i18n", "messages.ts");
const rawMessagesDir = path.join(srcRoot, "i18n", "messages");

function transpileTsModule(source, filename) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
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

function loadSupportedLanguages() {
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

  const supportedLanguages = sandbox.module.exports?.supportedLanguages;
  if (!Array.isArray(supportedLanguages)) {
    throw new Error("Failed to load supportedLanguages from messages.ts");
  }

  return supportedLanguages;
}

function loadRawLocaleBundles(supportedLanguages) {
  const { compileTsModule } = createTsSandbox(messagesPath);
  const bundles = {};
  const exportNames = {};

  for (const locale of supportedLanguages) {
    const filename = path.join(rawMessagesDir, `${locale}.ts`);
    const mod = compileTsModule(filename);
    const exportKeys = Object.keys(mod);
    if (exportKeys.length !== 1) {
      throw new Error(`Expected a single export in ${filename}`);
    }
    exportNames[locale] = exportKeys[0];
    bundles[locale] = mod[exportKeys[0]];
  }

  return { bundles, exportNames };
}

function serializeLocaleFile(exportName, values) {
  const lines = ["// Auto-generated from messages.ts", `export const ${exportName} = {`];
  const entries = Object.entries(values);

  for (const [key, value] of entries) {
    lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value)},`);
  }

  lines.push("} as const;", "");
  return `${lines.join("\n")}`;
}

const supportedLanguages = loadSupportedLanguages();
const { bundles, exportNames } = loadRawLocaleBundles(supportedLanguages);
const en = bundles.en;

if (!en || typeof en !== "object") {
  throw new Error("Missing raw en locale bundle");
}

const enKeys = Object.keys(en);
let updatedFileCount = 0;
let insertedKeyCount = 0;

for (const locale of supportedLanguages) {
  if (locale === "en") continue;

  const filename = path.join(rawMessagesDir, `${locale}.ts`);
  const exportName = exportNames[locale];
  const bundle = bundles[locale] ?? {};
  const next = {};
  let missingCount = 0;

  for (const key of enKeys) {
    if (Object.prototype.hasOwnProperty.call(bundle, key)) {
      next[key] = bundle[key];
    } else {
      next[key] = en[key];
      missingCount += 1;
    }
  }

  for (const [key, value] of Object.entries(bundle)) {
    if (Object.prototype.hasOwnProperty.call(next, key)) continue;
    next[key] = value;
  }

  if (missingCount === 0) continue;

  fs.writeFileSync(filename, serializeLocaleFile(exportName, next), "utf8");
  updatedFileCount += 1;
  insertedKeyCount += missingCount;
  console.log(`updated ${locale}: inserted ${missingCount} missing keys`);
}

if (updatedFileCount === 0) {
  console.log("No locale files required key sync.");
} else {
  console.log(`Synced ${insertedKeyCount} missing keys across ${updatedFileCount} locale files.`);
}

