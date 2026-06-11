import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const {
  buildRows,
  collectUsageByKey,
  renderMarkdown,
} = require("../i18n/generate-untranslated-remediation-report.cjs");

describe("i18n remediation report generator", () => {
  it("maps statically declared keys to production usage files", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hqcc-i18n-usage-"));

    const directFile = path.join(tempDir, "Direct.tsx");
    const formattedFile = path.join(tempDir, "Formatted.tsx");
    const typedFile = path.join(tempDir, "Typed.ts");
    const ignoredTestFile = path.join(tempDir, "Ignored.test.tsx");

    fs.writeFileSync(directFile, 'const value = t("actions.apply");\n', "utf8");
    fs.writeFileSync(
      formattedFile,
      'const value = formatMessageWith(t, "decks.addCards", { count: 2 });\n',
      "utf8",
    );
    fs.writeFileSync(
      typedFile,
      'const labels: Record<string, MessageKey> = { primary: "actions.apply" };\n',
      "utf8",
    );
    fs.writeFileSync(ignoredTestFile, 'const value = t("actions.apply");\n', "utf8");

    const usage = collectUsageByKey(
      [directFile, formattedFile, typedFile],
      ["actions.apply", "decks.addCards"],
    );

    expect(usage.get("actions.apply")).toEqual([
      path.relative(process.cwd(), directFile).split(path.sep).join("/"),
      path.relative(process.cwd(), typedFile).split(path.sep).join("/"),
    ]);
    expect(usage.get("decks.addCards")).toEqual([
      path.relative(process.cwd(), formattedFile).split(path.sep).join("/"),
    ]);
  });

  it("marks raw-missing keys separately from untranslated keys and renders markdown", () => {
    const messages = {
      en: {
        "actions.apply": "Apply",
        "decks.addCards": "Add cards…",
      },
      fr: {
        "actions.apply": "Apply",
        "decks.addCards": "Ajouter des cartes…",
      },
      de: {
        "actions.apply": "Apply",
        "decks.addCards": "Add cards…",
      },
    };

    const rawBundles = {
      en: messages.en,
      fr: {
        "actions.apply": "Apply",
        "decks.addCards": "Ajouter des cartes…",
      },
      de: {
        "actions.apply": "Apply",
      },
    };

    const usageByKey = new Map([
      ["actions.apply", ["src/components/Example.tsx"]],
      ["decks.addCards", ["src/components/Decks/DecksGridPanel.tsx"]],
    ]);

    const rows = buildRows({
      messages,
      rawBundles,
      supportedLanguages: ["en", "fr", "de"],
      usageByKey,
    });

    expect(rows).toEqual([
      {
        locale: "fr",
        key: "actions.apply",
        englishSource: "Apply",
        currentLocaleValue: "Apply",
        status: "untranslated",
        usageFiles: ["src/components/Example.tsx"],
        notes: "",
      },
      {
        locale: "de",
        key: "actions.apply",
        englishSource: "Apply",
        currentLocaleValue: "Apply",
        status: "untranslated",
        usageFiles: ["src/components/Example.tsx"],
        notes: "",
      },
      {
        locale: "de",
        key: "decks.addCards",
        englishSource: "Add cards…",
        currentLocaleValue: "Add cards…",
        status: "missing",
        usageFiles: ["src/components/Decks/DecksGridPanel.tsx"],
        notes: "",
      },
    ]);

    const markdown = renderMarkdown({
      generatedOn: "2026-06-03",
      rows,
      summary: [
        { locale: "de", total: 2, untranslated: 1, missing: 1 },
        { locale: "fr", total: 1, untranslated: 1, missing: 0 },
      ],
      scannedFilesCount: 3,
      visibleLanguages: ["en", "fr"],
    });

    expect(markdown).toContain("# i18n Untranslated Remediation Report");
    expect(markdown).toContain("| de | actions.apply | Apply | Apply | untranslated | `src/components/Example.tsx` |  |");
    expect(markdown).toContain("| de | decks.addCards | Add cards… | Add cards… | missing | `src/components/Decks/DecksGridPanel.tsx` |  |");
    expect(markdown).toContain("Source scan: Production files under `src/` only");
  });
});
