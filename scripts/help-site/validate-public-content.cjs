const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const docsRoot = path.join(repoRoot, "help-site", "docs");

function listMarkdownFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".md") ? [fullPath] : [];
  });
}

function frontmatterQuestionIds(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return [];

  const lines = match[1].split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith("source_questions:"));
  if (start === -1) return [];

  const sourceLines = [lines[start]];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!/^\s+/.test(lines[index])) break;
    sourceLines.push(lines[index]);
  }

  return sourceLines.join("\n").match(/Q-\d{4}/g) || [];
}

function faqQuestionSections(markdown) {
  return [...markdown.matchAll(/^## (.+)\s*\r?\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)].map(
    (match) => ({ question: match[1].trim(), body: match[2].trim() }),
  );
}

function unique(values) {
  return [...new Set(values)];
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function resolveMarkdownLink(sourceFile, rawHref) {
  const href = rawHref.replace(/^<|>$/g, "").split("#")[0].split("?")[0];
  if (!href || /^(?:https?:|mailto:|tel:)/.test(href)) return null;
  if (href.startsWith("/")) return path.join(docsRoot, href);
  return path.resolve(path.dirname(sourceFile), decodeURIComponent(href));
}

function validateLinks(files, errors) {
  for (const file of files) {
    const markdown = fs.readFileSync(file, "utf8");
    const links = [...markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]);
    for (const href of links) {
      const resolved = resolveMarkdownLink(file, href);
      if (!resolved) continue;
      const candidates = [resolved];
      if (!path.extname(resolved)) candidates.push(`${resolved}.md`, path.join(resolved, "index.md"));
      if (!candidates.some((candidate) => fs.existsSync(candidate))) {
        errors.push(`Broken link in ${path.relative(docsRoot, file)}: ${href}`);
      }
    }
  }
}

function main() {
  const errors = [];
  const files = listMarkdownFiles(docsRoot);
  const faqFiles = files.filter((file) => path.relative(docsRoot, file).startsWith(`faq${path.sep}`));
  const readerFiles = files.filter((file) => !path.relative(docsRoot, file).startsWith(`faq${path.sep}`));
  const allCorpus = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  const readerSourceIds = unique(readerFiles.flatMap((file) => frontmatterQuestionIds(fs.readFileSync(file, "utf8"))));
  const faqSourceRows = faqFiles.flatMap((file) => frontmatterQuestionIds(fs.readFileSync(file, "utf8")));
  const faqSourceIds = unique(faqSourceRows);
  const expectedIds = Array.from(
    { length: 351 },
    (_, index) => `Q-${String(index + 1).padStart(4, "0")}`,
  );
  const expectedIdSet = new Set(expectedIds);
  const faqSections = faqFiles.flatMap((file) => {
    const markdown = fs.readFileSync(file, "utf8");
    if (frontmatterQuestionIds(markdown).length === 0) return [];
    return faqQuestionSections(markdown).map((section) => ({ ...section, file }));
  });

  if (faqSourceRows.length !== 351) {
    errors.push(`Expected 351 FAQ source-question mappings, found ${faqSourceRows.length}`);
  }
  const duplicateFaqIds = duplicateValues(faqSourceRows);
  if (duplicateFaqIds.length) {
    errors.push(`Question IDs mapped by more than one FAQ page: ${duplicateFaqIds.join(", ")}`);
  }
  for (const id of expectedIds) {
    if (!readerSourceIds.includes(id)) errors.push(`${id} is not mapped to a full public article`);
    if (!faqSourceIds.includes(id)) errors.push(`${id} is not mapped to a public FAQ page`);
  }
  const unknownPublicIds = unique([...readerSourceIds, ...faqSourceIds]).filter(
    (id) => !expectedIdSet.has(id),
  );
  if (unknownPublicIds.length) errors.push(`Unknown public question IDs: ${unknownPublicIds.join(", ")}`);

  if (faqSections.length !== faqSourceRows.length - 1) {
    errors.push(
      `Expected 350 FAQ answer sections for 351 source questions, found ${faqSections.length}`,
    );
  }
  const duplicateQuestions = duplicateValues(faqSections.map((section) => section.question));
  if (duplicateQuestions.length) {
    errors.push(`Duplicate FAQ question headings: ${duplicateQuestions.join(" | ")}`);
  }
  for (const section of faqSections) {
    const relativeFile = path.relative(docsRoot, section.file);
    if (section.body.length < 40) {
      errors.push(`FAQ answer is too short in ${relativeFile}: ${section.question}`);
    }
    if (!/\[Read the full guidance\]\([^)]+\)/.test(section.body)) {
      errors.push(`FAQ answer lacks full-guidance link in ${relativeFile}: ${section.question}`);
    }
  }

  if (allCorpus.includes("[[")) errors.push("Unresolved Obsidian links remain in public content");

  const implementationTerms = [
    "Dexie",
    "IndexedDB",
    "WebGL",
    "localStorage",
    "sessionStorage",
    "keyBindingUtils",
    "StockpilePanelContent",
    "browser automation",
    "unit test",
    "test fixture",
    "MIME type",
    "S14",
  ];
  for (const term of implementationTerms) {
    if (allCorpus.toLowerCase().includes(term.toLowerCase())) errors.push(`Customer-facing content contains implementation term: ${term}`);
  }

  validateLinks(files, errors);

  if (errors.length) {
    console.error(`Public help validation failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(
    `Validated ${files.length} public pages, ${faqSourceRows.length} source questions, ` +
      `${faqSections.length} FAQ answers, full-article coverage, and all local links.`,
  );
}

main();
