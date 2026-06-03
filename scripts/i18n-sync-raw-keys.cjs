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

function loadJson(filename) {
  if (!fs.existsSync(filename)) return null;
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

const supportedLanguages = loadSupportedLanguages();
const namespaces = getNamespaces();
let updatedFileCount = 0;
let insertedKeyCount = 0;

for (const namespace of namespaces) {
  const enFilename = path.join(rawLocalesDir, "en", `${namespace}.json`);
  const enValues = loadJson(enFilename);

  if (!enValues || typeof enValues !== "object") {
    throw new Error(`Missing or invalid English namespace file: ${enFilename}`);
  }

  const enKeys = Object.keys(enValues);

  for (const locale of supportedLanguages) {
    if (locale === "en") continue;

    const filename = path.join(rawLocalesDir, locale, `${namespace}.json`);
    const values = loadJson(filename) ?? {};
    const next = {};
    let missingCount = 0;

    for (const key of enKeys) {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        next[key] = values[key];
      } else {
        next[key] = enValues[key];
        missingCount += 1;
      }
    }

    for (const [key, value] of Object.entries(values)) {
      if (Object.prototype.hasOwnProperty.call(next, key)) continue;
      next[key] = value;
    }

    if (missingCount === 0) continue;

    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(next, null, 2) + "\n", "utf8");
    updatedFileCount += 1;
    insertedKeyCount += missingCount;
    console.log(`updated ${locale}/${namespace}: inserted ${missingCount} missing keys`);
  }
}

if (updatedFileCount === 0) {
  console.log("No locale files required key sync.");
} else {
  console.log(`Synced ${insertedKeyCount} missing keys across ${updatedFileCount} locale files.`);
}
