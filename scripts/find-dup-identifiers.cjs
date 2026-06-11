#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Project, ts } = require("ts-morph");

const DEFAULT_REPO_ROOT = "/Users/markforster/Workspace/heroquest-card-creator";
const DEFAULT_SCOPE = "src";
const DEFAULT_OUT_DIR = path.join(
  DEFAULT_REPO_ROOT,
  "artefacts",
  "reports",
  "dup-identifiers",
);
const DEFAULT_IGNORE_PATTERNS = [
  /(?:^|\/)__tests__(?:\/|$)/,
  /(?:^|\/)__testutils__(?:\/|$)/,
  /(?:^|\/)src\/__tests__(?:\/|$)/,
  /\.test\.tsx?$/,
  /\.spec\.tsx?$/,
];

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function stripCommentsAndWhitespace(text) {
  const withoutLine = text.replace(/\/\/.*$/gm, "");
  const withoutBlock = withoutLine.replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutBlock.replace(/\s+/g, "");
}

function hashText(text) {
  return crypto.createHash("sha1").update(text).digest("hex");
}

function toPosixRelativePath(repoRoot, filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function getNodeName(node) {
  if (typeof node.getName === "function") {
    const name = node.getName();
    if (typeof name === "string" && name.length > 0) return name;
  }

  if (typeof node.getNameNode === "function") {
    const nameNode = node.getNameNode();
    if (nameNode) return nameNode.getText();
  }

  return null;
}

function getLineNumber(sourceFile, pos) {
  return sourceFile.getLineAndColumnAtPos(pos).line;
}

function createEntry({ repoRoot, filePath, name, kind, node, bodyNode }) {
  const sourceFile = node.getSourceFile();
  const entry = {
    name,
    kind,
    file: toPosixRelativePath(repoRoot, filePath),
    startLine: getLineNumber(sourceFile, node.getStart()),
    endLine: getLineNumber(sourceFile, node.getEnd()),
  };

  if (bodyNode) {
    const normalized = stripCommentsAndWhitespace(bodyNode.getText());
    entry.bodyHash = hashText(normalized);
  }

  return entry;
}

function addGroupEntry(map, key, entry) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(entry);
}

function shouldIgnoreFile(repoRoot, filePath, ignorePatterns = DEFAULT_IGNORE_PATTERNS) {
  const relativePath = toPosixRelativePath(repoRoot, filePath);
  return ignorePatterns.some((pattern) => pattern.test(relativePath));
}

function collectDuplicateIdentifiers({
  repoRoot = DEFAULT_REPO_ROOT,
  scope = DEFAULT_SCOPE,
  tsConfigFilePath = path.join(DEFAULT_REPO_ROOT, "tsconfig.json"),
  ignorePatterns = DEFAULT_IGNORE_PATTERNS,
} = {}) {
  const scopeRoot = path.join(repoRoot, scope);
  const project = new Project({
    tsConfigFilePath,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  });

  project.addSourceFilesAtPaths(path.join(scopeRoot, "**/*.{ts,tsx}"));

  const sourceFiles = project
    .getSourceFiles()
    .filter(
      (sourceFile) =>
        !sourceFile.isDeclarationFile() &&
        !shouldIgnoreFile(repoRoot, sourceFile.getFilePath(), ignorePatterns),
    );

  const exactMap = new Map();
  const nameOnlyMap = new Map();

  function addEntry(params) {
    const entry = createEntry(params);
    addGroupEntry(nameOnlyMap, entry.name, entry);

    if (entry.bodyHash) {
      addGroupEntry(exactMap, `${entry.name}|${entry.bodyHash}`, entry);
    }
  }

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();

    for (const node of sourceFile.getDescendants()) {
      if (ts.isFunctionDeclaration(node.compilerNode)) {
        const name = getNodeName(node);
        if (name) {
          addEntry({ repoRoot, filePath, name, kind: "function", node, bodyNode: node.getBody() });
        }
        continue;
      }

      if (ts.isMethodDeclaration(node.compilerNode)) {
        const name = getNodeName(node);
        if (name) {
          addEntry({ repoRoot, filePath, name, kind: "method", node, bodyNode: node.getBody() });
        }
        continue;
      }

      if (ts.isVariableDeclaration(node.compilerNode) && node.getInitializer()) {
        const initializer = node.getInitializer();
        if (
          initializer &&
          (ts.isArrowFunction(initializer.compilerNode) ||
            ts.isFunctionExpression(initializer.compilerNode))
        ) {
          const name = getNodeName(node);
          if (name) {
            addEntry({
              repoRoot,
              filePath,
              name,
              kind: "function",
              node,
              bodyNode: initializer,
            });
          }
        }
        continue;
      }

      if (ts.isPropertyAssignment(node.compilerNode)) {
        const initializer = node.getInitializer();
        if (
          initializer &&
          (ts.isArrowFunction(initializer.compilerNode) ||
            ts.isFunctionExpression(initializer.compilerNode))
        ) {
          const name = getNodeName(node);
          if (name) {
            addEntry({
              repoRoot,
              filePath,
              name,
              kind: "function",
              node,
              bodyNode: initializer,
            });
          }
        }
        continue;
      }

      if (ts.isPropertyDeclaration(node.compilerNode)) {
        const initializer = node.getInitializer();
        if (
          initializer &&
          (ts.isArrowFunction(initializer.compilerNode) ||
            ts.isFunctionExpression(initializer.compilerNode))
        ) {
          const name = getNodeName(node);
          if (name) {
            addEntry({
              repoRoot,
              filePath,
              name,
              kind: "function",
              node,
              bodyNode: initializer,
            });
          }
        }
        continue;
      }

      if (ts.isTypeAliasDeclaration(node.compilerNode)) {
        addEntry({ repoRoot, filePath, name: node.getName(), kind: "type", node });
        continue;
      }

      if (ts.isInterfaceDeclaration(node.compilerNode)) {
        addEntry({ repoRoot, filePath, name: node.getName(), kind: "interface", node });
        continue;
      }

      if (ts.isEnumDeclaration(node.compilerNode)) {
        addEntry({ repoRoot, filePath, name: node.getName(), kind: "enum", node });
        continue;
      }

      if (ts.isClassDeclaration(node.compilerNode)) {
        const name = getNodeName(node);
        if (name) addEntry({ repoRoot, filePath, name, kind: "class", node });
      }
    }
  }

  const exactDuplicates = Array.from(exactMap.entries())
    .filter(([, entries]) => entries.length >= 2)
    .map(([key, entries]) => {
      const [name, bodyHash] = key.split("|");
      return { name, bodyHash, entries };
    })
    .sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name));

  const nameDuplicates = Array.from(nameOnlyMap.entries())
    .filter(([, entries]) => entries.length >= 2)
    .map(([name, entries]) => ({
      name,
      entries,
      distinctBodies: new Set(entries.map((entry) => entry.bodyHash).filter(Boolean)).size,
    }))
    .sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name));

  return {
    generatedAt: new Date().toISOString(),
    scope,
    exactDuplicates,
    nameDuplicates,
  };
}

function renderMarkdown(report) {
  let md = "# Duplicate Identifier Report\n\n";
  md += `Generated: ${report.generatedAt}\n`;
  md += "\n## Exact Duplicates (name + body)\n\n";

  if (report.exactDuplicates.length === 0) {
    md += "- None found\n";
  } else {
    for (const group of report.exactDuplicates) {
      md += `### ${group.name}\n`;
      md += `- Instances: ${group.entries.length}\n`;
      md += `- Body hash: ${group.bodyHash}\n`;
      for (const entry of group.entries) {
        md += `- ${entry.kind} — \`${entry.file}:${entry.startLine}-${entry.endLine}\`\n`;
      }
      md += "\n";
    }
  }

  md += "## Name Duplicates (may differ)\n\n";
  if (report.nameDuplicates.length === 0) {
    md += "- None found\n";
  } else {
    for (const group of report.nameDuplicates) {
      md += `### ${group.name}\n`;
      md += `- Instances: ${group.entries.length}\n`;
      md += `- Distinct bodies: ${group.distinctBodies}\n`;
      for (const entry of group.entries) {
        md += `- ${entry.kind} — \`${entry.file}:${entry.startLine}-${entry.endLine}\`\n`;
      }
      md += "\n";
    }
  }

  return md;
}

function writeReport(report, outDir = DEFAULT_OUT_DIR) {
  ensureDir(outDir);
  const outJson = path.join(outDir, "dup-identifiers.json");
  const outMd = path.join(outDir, "dup-identifiers.md");

  fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
  fs.writeFileSync(outMd, renderMarkdown(report));

  return { outJson, outMd };
}

function main() {
  const report = collectDuplicateIdentifiers();
  const { outJson, outMd } = writeReport(report);
  console.log(`Wrote ${outJson}`);
  console.log(`Wrote ${outMd}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  collectDuplicateIdentifiers,
  renderMarkdown,
  writeReport,
  stripCommentsAndWhitespace,
  shouldIgnoreFile,
};
