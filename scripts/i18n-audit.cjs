/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createRequire } = require("module");
const ts = require("typescript");

const messagesPath = path.join(__dirname, "..", "src", "i18n", "messages.ts");
const source = fs.readFileSync(messagesPath, "utf8");

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
  fileName: messagesPath,
});

const baseDir = path.dirname(messagesPath);
const hostRequire = createRequire(messagesPath);

const compileTsModule = (filename) => {
  const src = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
    fileName: filename,
  });
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

const sandbox = {
  exports: {},
  module: { exports: {} },
  require: sandboxRequire,
  __dirname: baseDir,
  __filename: messagesPath,
  console,
};

sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
vm.runInContext(outputText, sandbox, { filename: messagesPath });

const exported = sandbox.module.exports;
const messages = exported?.messages;

if (!messages || typeof messages !== "object") {
  throw new Error("Failed to load messages from messages.ts");
}

const en = messages.en;
if (!en || typeof en !== "object") {
  throw new Error("Missing en bundle in messages.ts");
}

const keys = Object.keys(en).sort();
const languages = Object.keys(messages).sort();

const containsNonAscii = (value) => /[^\x00-\x7F]/.test(value);

const audit = languages.map((lang) => {
  const bundle = messages[lang] || {};
  const missing = keys.filter((key) => !(key in bundle));
  const untranslated = keys.filter((key) => key in bundle && bundle[key] === en[key]);
  return { lang, missing, untranslated };
});

const suspiciousEn = [];
for (const key of keys) {
  const value = en[key];
  if (typeof value !== "string") continue;
  if (containsNonAscii(value)) {
    suspiciousEn.push({ key, value });
    continue;
  }
  for (const lang of languages) {
    if (lang === "en") continue;
    const other = messages[lang]?.[key];
    if (other === value && typeof other === "string" && containsNonAscii(other)) {
      suspiciousEn.push({ key, value });
      break;
    }
  }
}

const SAMPLE_LIMIT = 10;

console.log(`i18n audit: ${keys.length} keys in en`);
for (const { lang, missing, untranslated } of audit) {
  console.log(`- ${lang}: missing ${missing.length}, untranslated ${untranslated.length}`);
  if (missing.length) {
    console.log(`  missing sample: ${missing.slice(0, SAMPLE_LIMIT).join(", ")}`);
  }
  if (untranslated.length) {
    console.log(`  untranslated sample: ${untranslated.slice(0, SAMPLE_LIMIT).join(", ")}`);
  }
}

console.log("");
if (suspiciousEn.length === 0) {
  console.log("Suspicious EN values: none");
} else {
  console.log("Suspicious EN values:");
  for (const item of suspiciousEn) {
    console.log(`- ${item.key}: ${item.value}`);
  }
}
