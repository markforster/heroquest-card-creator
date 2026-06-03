/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createRequire } = require("module");
const ts = require("typescript");

const repoRoot = path.join(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");
const messagesPath = path.join(srcRoot, "i18n", "messages.ts");
const rawLocalesDir = path.join(srcRoot, "i18n", "locales");
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

function getNamespaces() {
  const enDir = path.join(rawLocalesDir, "en");
  return fs.readdirSync(enDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""))
    .sort((a, b) => a.localeCompare(b));
}

function loadLocaleNamespace(locale, namespace) {
  const filename = path.join(rawLocalesDir, locale, `${namespace}.json`);
  if (!fs.existsSync(filename)) return null;
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

function loadRawLocaleBundles(supportedLanguages, namespaces) {
  const mergedBundles = {};
  const namespaceBundles = {};

  for (const locale of supportedLanguages) {
    const merged = {};
    namespaceBundles[locale] = {};
    for (const namespace of namespaces) {
      const values = loadLocaleNamespace(locale, namespace);
      namespaceBundles[locale][namespace] = values;
      if (values && typeof values === "object") {
        Object.assign(merged, values);
      }
    }
    mergedBundles[locale] = merged;
  }

  return { mergedBundles, namespaceBundles };
}

function sample(keys) {
  return keys.slice(0, SAMPLE_LIMIT).join(", ");
}

const supportedLanguages = loadSupportedLanguages();
const namespaces = getNamespaces();
const { mergedBundles, namespaceBundles } = loadRawLocaleBundles(supportedLanguages, namespaces);
const en = mergedBundles.en;

if (!en || typeof en !== "object") {
  throw new Error("Missing raw en locale bundle");
}

const enKeys = Object.keys(en).sort();
let hasErrors = false;

console.log(`i18n raw locale check: ${enKeys.length} keys in en`);

for (const locale of supportedLanguages) {
  if (locale === "en") continue;

  const missingNamespaces = namespaces.filter((namespace) => !namespaceBundles[locale][namespace]);
  if (missingNamespaces.length) {
    hasErrors = true;
    console.log(`- ${locale}: missing namespace files ${missingNamespaces.join(", ")}`);
    continue;
  }

  const bundle = mergedBundles[locale] ?? {};
  const localeKeys = Object.keys(bundle).sort();
  const missing = enKeys.filter((key) => !Object.prototype.hasOwnProperty.call(bundle, key));
  const extra = localeKeys.filter((key) => !Object.prototype.hasOwnProperty.call(en, key));
  const untranslated = enKeys.filter(
    (key) =>
      Object.prototype.hasOwnProperty.call(bundle, key) &&
      bundle[key] === en[key],
  );

  console.log(
    `- ${locale}: missing ${missing.length}, extra ${extra.length}, untranslated ${untranslated.length}`,
  );

  if (missing.length) {
    hasErrors = true;
    console.log(`  missing sample: ${sample(missing)}`);
  }
  if (extra.length) {
    hasErrors = true;
    console.log(`  extra sample: ${sample(extra)}`);
  }
  if (untranslated.length) {
    console.log(`  untranslated sample: ${sample(untranslated)}`);
  }
}

if (hasErrors) {
  console.error("");
  console.error("Raw locale check failed. Add missing keys or remove extra keys.");
  process.exit(1);
}
