#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ts = require("typescript");

const repoRoot = "/Users/markforster/Workspace/heroquest-card-creator";
const srcRoot = path.join(repoRoot, "src");
const outDir = path.join(repoRoot, "artefacts", "reports", "dup-identifiers");
const outJson = path.join(outDir, "dup-identifiers.json");
const outMd = path.join(outDir, "dup-identifiers.md");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function listSourceFiles(dir) {
  const results = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === "out") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        if (full.endsWith(".ts") || full.endsWith(".tsx")) {
          results.push(full);
        }
      }
    }
  }
  return results;
}

function stripCommentsAndWhitespace(text) {
  const withoutLine = text.replace(/\/\/.*$/gm, "");
  const withoutBlock = withoutLine.replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutBlock.replace(/\s+/g, "");
}

function hashText(text) {
  return crypto.createHash("sha1").update(text).digest("hex");
}

function getLineAndChar(sf, pos) {
  const { line, character } = sf.getLineAndCharacterOfPosition(pos);
  return { line: line + 1, column: character + 1 };
}

function record(locations, name, entry) {
  if (!locations.has(name)) locations.set(name, []);
  locations.get(name).push(entry);
}

const sourceFiles = listSourceFiles(srcRoot);
const exactMap = new Map(); // key: name|hash
const nameOnlyMap = new Map(); // key: name

for (const filePath of sourceFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, undefined);

  function addEntry({ name, kind, node, bodyNode }) {
    const start = node.getStart(sf);
    const end = node.getEnd();
    const startLoc = getLineAndChar(sf, start);
    const endLoc = getLineAndChar(sf, end);
    const entry = {
      name,
      kind,
      file: path.relative(repoRoot, filePath),
      startLine: startLoc.line,
      endLine: endLoc.line,
    };
    if (bodyNode) {
      const raw = bodyNode.getText(sf);
      const normalized = stripCommentsAndWhitespace(raw);
      entry.bodyHash = hashText(normalized);
    }
    record(nameOnlyMap, name, entry);

    if (bodyNode) {
      const exactKey = `${name}|${entry.bodyHash}`;
      if (!exactMap.has(exactKey)) exactMap.set(exactKey, []);
      exactMap.get(exactKey).push(entry);
    }
  }

  function walk(node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      addEntry({ name: node.name.text, kind: "function", node, bodyNode: node.body });
    }
    if (ts.isMethodDeclaration(node) && node.name) {
      const name = node.name.getText(sf);
      addEntry({ name, kind: "method", node, bodyNode: node.body });
    }
    if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
        addEntry({
          name: node.parent.name.text,
          kind: "function",
          node: node.parent,
          bodyNode: node.body,
        });
      }
    }
    if (ts.isPropertyAssignment(node)) {
      if (
        node.initializer &&
        (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer)) &&
        node.name
      ) {
        const name = node.name.getText(sf);
        addEntry({ name, kind: "function", node, bodyNode: node.initializer.body });
      }
    }
    if (ts.isPropertyDeclaration(node)) {
      if (
        node.initializer &&
        (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer)) &&
        node.name
      ) {
        const name = node.name.getText(sf);
        addEntry({ name, kind: "function", node, bodyNode: node.initializer.body });
      }
    }
    if (ts.isTypeAliasDeclaration(node)) {
      addEntry({ name: node.name.text, kind: "type", node });
    }
    if (ts.isInterfaceDeclaration(node)) {
      addEntry({ name: node.name.text, kind: "interface", node });
    }
    if (ts.isEnumDeclaration(node)) {
      addEntry({ name: node.name.text, kind: "enum", node });
    }
    if (ts.isClassDeclaration(node) && node.name) {
      addEntry({ name: node.name.text, kind: "class", node });
    }

    ts.forEachChild(node, walk);
  }

  walk(sf);
}

function groupExactDuplicates() {
  const groups = [];
  for (const [key, entries] of exactMap.entries()) {
    if (entries.length < 2) continue;
    const [name, bodyHash] = key.split("|");
    groups.push({ name, bodyHash, entries });
  }
  groups.sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name));
  return groups;
}

function groupNameOnlyDuplicates() {
  const groups = [];
  for (const [name, entries] of nameOnlyMap.entries()) {
    if (entries.length < 2) continue;
    const uniqueHashes = new Set(entries.map((e) => e.bodyHash).filter(Boolean));
    groups.push({ name, entries, distinctBodies: uniqueHashes.size || 0 });
  }
  groups.sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name));
  return groups;
}

const exactGroups = groupExactDuplicates();
const nameGroups = groupNameOnlyDuplicates();

const report = {
  generatedAt: new Date().toISOString(),
  scope: "src",
  exactDuplicates: exactGroups,
  nameDuplicates: nameGroups,
};

ensureDir(outDir);
fs.writeFileSync(outJson, JSON.stringify(report, null, 2));

let md = "# Duplicate Identifier Report\n\n";
md += `Generated: ${report.generatedAt}\n`;
md += "\n## Exact Duplicates (name + body)\n\n";
if (exactGroups.length === 0) {
  md += "- None found\n";
} else {
  for (const group of exactGroups) {
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
if (nameGroups.length === 0) {
  md += "- None found\n";
} else {
  for (const group of nameGroups) {
    md += `### ${group.name}\n`;
    md += `- Instances: ${group.entries.length}\n`;
    md += `- Distinct bodies: ${group.distinctBodies}\n`;
    for (const entry of group.entries) {
      md += `- ${entry.kind} — \`${entry.file}:${entry.startLine}-${entry.endLine}\`\n`;
    }
    md += "\n";
  }
}

fs.writeFileSync(outMd, md);
console.log(`Wrote ${outJson}`);
console.log(`Wrote ${outMd}`);
