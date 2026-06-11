import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const {
  collectDuplicateIdentifiers,
  renderMarkdown,
  shouldIgnoreFile,
} = require("../find-dup-identifiers.cjs");

describe("find-dup-identifiers script", () => {
  it("groups duplicate names separately from exact duplicate bodies", () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hqcc-dup-identifiers-"));
    const srcDir = path.join(repoRoot, "src");
    fs.mkdirSync(srcDir, { recursive: true });

    const tsConfigPath = path.join(repoRoot, "tsconfig.json");
    fs.writeFileSync(
      tsConfigPath,
      JSON.stringify(
        {
          compilerOptions: {
            target: "es2019",
            module: "commonjs",
            strict: true,
          },
          include: ["src/**/*.ts", "src/**/*.tsx"],
        },
        null,
        2,
      ),
      "utf8",
    );

    fs.writeFileSync(
      path.join(srcDir, "one.ts"),
      [
        "export function sameBody(value: number) {",
        "  return value + 1;",
        "}",
        "",
        "export function differentBody(value: number) {",
        "  return value + 2;",
        "}",
        "",
        "export const sameArrow = (value: number) => value * 2;",
      ].join("\n"),
      "utf8",
    );

    fs.writeFileSync(
      path.join(srcDir, "two.ts"),
      [
        "export function sameBody(value: number) {",
        "  return value + 1;",
        "}",
        "",
        "export function differentBody(value: number) {",
        "  return value + 3;",
        "}",
        "",
        "export const sameArrow = (value: number) => value * 2;",
      ].join("\n"),
      "utf8",
    );

    const report = collectDuplicateIdentifiers({
      repoRoot,
      scope: "src",
      tsConfigFilePath: tsConfigPath,
    });

    const exactSameBody = report.exactDuplicates.find((group: { name: string }) => group.name === "sameBody");
    const exactSameArrow = report.exactDuplicates.find((group: { name: string }) => group.name === "sameArrow");
    const differentBody = report.nameDuplicates.find(
      (group: { name: string }) => group.name === "differentBody",
    );

    expect(exactSameBody?.entries).toHaveLength(2);
    expect(exactSameArrow?.entries).toHaveLength(2);
    expect(differentBody?.entries).toHaveLength(2);
    expect(differentBody?.distinctBodies).toBe(2);

    const markdown = renderMarkdown(report);
    expect(markdown).toContain("## Exact Duplicates (name + body)");
    expect(markdown).toContain("### sameBody");
    expect(markdown).toContain("### differentBody");
  });

  it("ignores test files and test utilities from the report", () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hqcc-dup-identifiers-ignore-"));
    const srcDir = path.join(repoRoot, "src");
    const testsDir = path.join(srcDir, "__tests__");
    const testUtilsDir = path.join(srcDir, "lib", "__testutils__");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(testsDir, { recursive: true });
    fs.mkdirSync(testUtilsDir, { recursive: true });

    const tsConfigPath = path.join(repoRoot, "tsconfig.json");
    fs.writeFileSync(
      tsConfigPath,
      JSON.stringify(
        {
          compilerOptions: {
            target: "es2019",
            module: "commonjs",
            strict: true,
          },
          include: ["src/**/*.ts", "src/**/*.tsx"],
        },
        null,
        2,
      ),
      "utf8",
    );

    fs.writeFileSync(
      path.join(srcDir, "prod-one.ts"),
      "export function keepMe(value: number) { return value + 1; }\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(srcDir, "prod-two.ts"),
      "export function keepMe(value: number) { return value + 1; }\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(testsDir, "ignored.test.ts"),
      "export function ignoredDuplicate(value: number) { return value + 1; }\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(testUtilsDir, "helper.ts"),
      "export function ignoredDuplicate(value: number) { return value + 1; }\n",
      "utf8",
    );

    const report = collectDuplicateIdentifiers({
      repoRoot,
      scope: "src",
      tsConfigFilePath: tsConfigPath,
    });

    expect(report.exactDuplicates.find((group: { name: string }) => group.name === "keepMe")?.entries).toHaveLength(2);
    expect(report.nameDuplicates.find((group: { name: string }) => group.name === "ignoredDuplicate")).toBeUndefined();
    expect(
      shouldIgnoreFile(repoRoot, path.join(testsDir, "ignored.test.ts")),
    ).toBe(true);
    expect(
      shouldIgnoreFile(repoRoot, path.join(testUtilsDir, "helper.ts")),
    ).toBe(true);
    expect(
      shouldIgnoreFile(repoRoot, path.join(srcDir, "prod-one.ts")),
    ).toBe(false);
  });
});
