"use strict";

const { spawn } = require("child_process");

function parseArgs(argv) {
  const args = [...argv];
  let maxOldSpaceSizeMb = "16384";

  if (args[0] && args[0].startsWith("--max-old-space-size=")) {
    maxOldSpaceSizeMb = args.shift().split("=")[1] || maxOldSpaceSizeMb;
  }

  if (args.length === 0) {
    throw new Error(
      "[run-node-task] Missing command. Usage: node scripts/run-node-task.cjs [--max-old-space-size=16384] <command> [...args]",
    );
  }

  return {
    command: args[0],
    commandArgs: args.slice(1),
    maxOldSpaceSizeMb,
  };
}

function buildNodeOptions(existingNodeOptions, maxOldSpaceSizeMb) {
  if (
    existingNodeOptions &&
    /(?:^|\s)--max-old-space-size(?:=|\s)\d+(?:\s|$)/.test(existingNodeOptions)
  ) {
    return existingNodeOptions;
  }

  const requestedHeapArg = `--max-old-space-size=${maxOldSpaceSizeMb}`;
  return existingNodeOptions
    ? `${existingNodeOptions} ${requestedHeapArg}`.trim()
    : requestedHeapArg;
}

function warnForNodeVersion() {
  const [majorText] = process.versions.node.split(".");
  const major = Number.parseInt(majorText, 10);

  if (!Number.isFinite(major) || major < 18) {
    console.error(
      `[run-node-task] Unsupported Node.js version ${process.versions.node}. Use Node 18.x or 20.x for this repo.`,
    );
    process.exit(1);
  }

  if (major >= 21) {
    console.warn(
      `[run-node-task] Node ${process.versions.node} is not the recommended runtime for heavy build/typecheck tasks in this repo. Prefer Node 20.x or 18.x if you hit memory pressure.`,
    );
  }
}

function main() {
  const { command, commandArgs, maxOldSpaceSizeMb } = parseArgs(process.argv.slice(2));

  warnForNodeVersion();

  const env = {
    ...process.env,
    NODE_OPTIONS: buildNodeOptions(process.env.NODE_OPTIONS, maxOldSpaceSizeMb),
  };

  const child = spawn(command, commandArgs, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(`[run-node-task] Failed to start '${command}': ${error.message}`);
    process.exit(1);
  });
}

main();
