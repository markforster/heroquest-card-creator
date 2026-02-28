const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, "package.json");

let pkg;
try {
  const raw = fs.readFileSync(packageJsonPath, "utf8");
  pkg = JSON.parse(raw);
} catch (err) {
  console.error("[info] Failed to read package.json:", err.message);
  process.exit(1);
}

const chalk = require("chalk");

const name = pkg && typeof pkg.name === "string" ? pkg.name.trim() : "";
const version = pkg && typeof pkg.version === "string" ? pkg.version.trim() : "";
const description =
  pkg && typeof pkg.description === "string" ? pkg.description.trim() : "";

const missing = [];
if (!name) missing.push("name");
if (!version) missing.push("version");
if (!description) missing.push("description");

if (missing.length > 0) {
  console.error(`[info] Missing fields: ${missing.join(", ")}`);
  console.log(
    [
      `${chalk.bold.blue("name:")} ${chalk.bold.cyan(name || "<missing>")}`,
      `${chalk.bold.blue("version:")} ${
        version ? chalk.green(version) : "<missing>"
      }`,
      `${chalk.bold.blue("description:")} ${chalk.white(
        description || "<missing>"
      )}`,
    ].join("\n")
  );
  process.exit(1);
}

console.log(
  [
    `${chalk.bold.blue("name:")} ${chalk.bold.cyan(name)}`,
    `${chalk.bold.blue("version:")} ${chalk.green(version)}`,
    `${chalk.bold.blue("description:")} ${chalk.white(description)}`,
  ].join("\n")
);
