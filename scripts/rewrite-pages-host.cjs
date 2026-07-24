const fs = require("fs");
const path = require("path");

const OLD_HOST = "https://markforster.github.io/heroquest-card-creator/";
const NEW_HOST = "https://heroquestcards.done-well.co.uk/";
const TEXT_EXTENSIONS = new Set([".html", ".xml", ".txt", ".json"]);

function rewriteFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const updated = original.split(OLD_HOST).join(NEW_HOST);

  if (updated !== original) {
    fs.writeFileSync(filePath, updated);
  }
}

function rewriteTree(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      rewriteTree(entryPath);
      continue;
    }

    if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      rewriteFile(entryPath);
    }
  }
}

function main() {
  const targetDir = process.argv[2];

  if (!targetDir) {
    console.error("Usage: node scripts/rewrite-pages-host.cjs <directory>");
    process.exit(1);
  }

  const resolvedTarget = path.resolve(targetDir);

  if (!fs.existsSync(resolvedTarget) || !fs.statSync(resolvedTarget).isDirectory()) {
    console.error(`Directory not found: ${resolvedTarget}`);
    process.exit(1);
  }

  rewriteTree(resolvedTarget);
}

main();
