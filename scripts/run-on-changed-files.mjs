#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const tool = process.argv[2];
const toolArgs = process.argv.slice(3);

if (tool !== "eslint" && tool !== "prettier") {
  console.error("Usage: run-on-changed-files.cjs <eslint|prettier> [...tool arguments]");
  process.exit(2);
}

function readGitPaths(args) {
  return execFileSync("git", args, { encoding: "utf8" }).split("\0").filter(Boolean);
}

const changedPaths = new Set([
  ...readGitPaths(["diff", "--name-only", "--diff-filter=ACMR", "-z", "HEAD"]),
  ...readGitPaths(["ls-files", "--others", "--exclude-standard", "-z"]),
]);

const eslintExtension = /\.(?:[cm]?[jt]sx?)$/i;
const prettierExtension = /\.(?:[cm]?[jt]sx?|json|css|scss)$/i;
const rootConfig = /^[^/]+\.(?:[cm]?[jt]sx?)$/i;
const rootFormatConfig = /^[^/]+\.json$/i;
const maintainedCode = /^(?:src|scripts|bin)\//;

const files = [...changedPaths]
  .filter((file) => existsSync(file))
  .filter((file) => {
    if (tool === "prettier") {
      return (
        prettierExtension.test(file) &&
        (maintainedCode.test(file) || rootConfig.test(file) || rootFormatConfig.test(file))
      );
    }
    return eslintExtension.test(file) && (maintainedCode.test(file) || rootConfig.test(file));
  });

if (files.length === 0) {
  console.log(`No changed files to process with ${tool}.`);
  process.exit(0);
}

const executable = process.platform === "win32" ? `${tool}.cmd` : tool;
const result = spawnSync(executable, [...toolArgs, ...files], {
  cwd: process.cwd(),
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
