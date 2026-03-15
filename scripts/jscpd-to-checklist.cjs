#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const reportPath = path.resolve(
  '/Users/markforster/Workspace/heroquest-card-creator/artefacts/reports/jscpd/jscpd-report.json'
);
const outputPath = path.resolve(
  '/Users/markforster/Workspace/heroquest-card-creator/artefacts/reports/jscpd/jscpd-todo.md'
);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function formatPairKey(first, second) {
  return `${first} || ${second}`;
}

function byLinesDesc(a, b) {
  return b.lines - a.lines;
}

function toLineRange(file) {
  return `${file.name}:${file.start}-${file.end}`;
}

const report = readJson(reportPath);
const duplicates = Array.isArray(report.duplicates) ? report.duplicates : [];
const stats = report.statistics || {};
const total = stats.total || {};

const groups = new Map();
for (const dup of duplicates) {
  const first = dup.firstFile?.name || 'unknown';
  const second = dup.secondFile?.name || 'unknown';
  const key = formatPairKey(first, second);
  if (!groups.has(key)) {
    groups.set(key, {
      first,
      second,
      items: [],
      totalLines: 0,
      totalTokens: 0,
    });
  }
  const group = groups.get(key);
  group.items.push(dup);
  group.totalLines += Number(dup.lines || 0);
  group.totalTokens += Number(dup.tokens || 0);
}

const grouped = Array.from(groups.values()).sort((a, b) => {
  if (b.totalLines !== a.totalLines) return b.totalLines - a.totalLines;
  if (b.items.length !== a.items.length) return b.items.length - a.items.length;
  return `${a.first} ${a.second}`.localeCompare(`${b.first} ${b.second}`);
});

let out = '';
out += '# Duplication Refactor Checklist (jscpd)\n\n';
out += `Generated: ${stats.detectionDate || 'unknown'}\n\n`;
out += '## Summary\n';
out += `- Clones: ${total.clones ?? duplicates.length}\n`;
out += `- Duplicated lines: ${total.duplicatedLines ?? 'unknown'}\n`;
out += `- Duplicated tokens: ${total.duplicatedTokens ?? 'unknown'}\n`;
out += `- Files scanned: ${total.sources ?? 'unknown'}\n`;
out += `- Total lines: ${total.lines ?? 'unknown'}\n`;
out += `- Duplication % (lines): ${total.percentage ?? 'unknown'}\n`;
out += `- Duplication % (tokens): ${total.percentageTokens ?? 'unknown'}\n\n`;

for (const group of grouped) {
  out += '## File Pair\n';
  out += `- First: \`${group.first}\`\n`;
  out += `- Second: \`${group.second}\`\n`;
  out += `- Total duplicated lines: ${group.totalLines}\n`;
  out += `- Occurrences: ${group.items.length}\n\n`;

  const items = group.items.slice().sort(byLinesDesc);
  for (const dup of items) {
    const firstRange = toLineRange(dup.firstFile);
    const secondRange = toLineRange(dup.secondFile);
    out += `- [ ] ${dup.lines} lines — \`${firstRange}\` ↔ \`${secondRange}\`\n`;
  }
  out += '\n';
}

fs.writeFileSync(outputPath, out, 'utf8');
console.log(`Wrote ${outputPath}`);
