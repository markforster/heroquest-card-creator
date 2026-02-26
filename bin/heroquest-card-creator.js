#!/usr/bin/env node
"use strict";

const http = require("http");
const fs = require("fs");
const os = require("os");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");
const mime = require("mime");
const yaml = require("yaml");
const chalk = require("chalk");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;
const HISTORY_LIMIT = 10;

function parseArgs(args) {
  let port = null;
  let portSpecified = false;
  let help = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }

    if (arg === "-p" || arg === "--port") {
      const next = args[i + 1];
      if (!next) {
        throw new Error("Missing value for --port");
      }
      port = Number(next);
      portSpecified = true;
      i += 1;
      continue;
    }

    if (arg.startsWith("--port=")) {
      port = Number(arg.split("=")[1]);
      portSpecified = true;
      continue;
    }
  }

  if (portSpecified) {
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error(`Invalid port: ${port}`);
    }
  }

  return { port, portSpecified, help };
}

function printHelp() {
  console.log(
    [
      "",
      "HeroQuest Card Creator",
      "",
      "Usage:",
      "  heroquest-card-creator [options]",
      "",
      "Options:",
      "  -p, --port <number>   Port to serve on (default 3000; auto-picks a free port if needed)",
      "  -h, --help            Show this help",
      "",
    ].join("\n")
  );
}

function toSafeFilePath(rootDir, pathname) {
  const fullPath = path.resolve(rootDir, "." + pathname);

  if (!fullPath.startsWith(rootDir + path.sep) && fullPath !== rootDir) {
    return null;
  }

  return fullPath;
}

function getFileForRequest(rootDir, pathname) {
  let resolvedPath = pathname;

  if (resolvedPath.endsWith("/")) {
    resolvedPath += "index.html";
  } else if (!path.extname(resolvedPath)) {
    resolvedPath += "/index.html";
  }

  const candidate = toSafeFilePath(rootDir, resolvedPath);
  if (!candidate) {
    return null;
  }

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  const notFound = path.join(rootDir, "404.html");
  if (fs.existsSync(notFound) && fs.statSync(notFound).isFile()) {
    return { fallback: notFound };
  }

  return null;
}

function createServer(rootDir) {
  return http.createServer((req, res) => {
    try {
      const rawUrl = req.url || "/";
      const pathOnly = rawUrl.split("?")[0];
      let pathname = decodeURIComponent(pathOnly || "/");
      if (!pathname.startsWith("/")) {
        pathname = `/${pathname}`;
      }
      pathname = pathname.replace(/\/{2,}/g, "/");
      const result = getFileForRequest(rootDir, pathname);

      if (!result) {
        res.statusCode = 404;
        res.end("Not Found");
        return;
      }

      const filePath = typeof result === "string" ? result : result.fallback;
      const isFallback = typeof result !== "string";

      const type = mime.getType(filePath) || "application/octet-stream";
      const contentType = type.startsWith("text/") ? `${type}; charset=utf-8` : type;

      res.statusCode = isFallback ? 404 : 200;
      res.setHeader("Content-Type", contentType);
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });
}

function getInfoFilePath() {
  return path.join(os.homedir(), ".hqcc", "info.yml");
}

function loadInfo() {
  const infoPath = getInfoFilePath();
  if (!fs.existsSync(infoPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(infoPath, "utf8");
    const parsed = yaml.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("[heroquest-card-creator] Failed to read info file. It will be recreated.");
    return null;
  }
}

function saveInfo(port, existing) {
  const infoPath = getInfoFilePath();
  const dir = path.dirname(infoPath);
  fs.mkdirSync(dir, { recursive: true });

  const previousPorts = Array.isArray(existing?.ports) ? existing.ports : [];
  const nextPorts = [port, ...previousPorts.filter((value) => value !== port)].slice(0, HISTORY_LIMIT);

  const payload = {
    lastPort: port,
    ports: nextPorts,
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(infoPath, yaml.stringify(payload), "utf8");
  } catch (error) {
    console.warn(
      "[heroquest-card-creator] Warning: Failed to write ~/.hqcc/info.yml; port history will not be saved."
    );
  }

  return payload;
}

function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function openBrowser(url) {
  let command;
  let args;

  if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  try {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.unref();
    return true;
  } catch (error) {
    return false;
  }
}

async function promptOpenBrowser(url) {
  if (!isInteractive()) {
    return;
  }

  const { default: inquirer } = await import("inquirer");
  const answer = await inquirer.prompt([
    {
      name: "openBrowser",
      type: "confirm",
      message: chalk.cyanBright("Open the app in your browser now?"),
      default: true,
    },
  ]);

  if (!answer.openBrowser) {
    return;
  }

  const opened = openBrowser(url);
  if (!opened) {
    console.warn("[heroquest-card-creator] Unable to open browser automatically. Open the URL manually.");
  }
}

function canConnect(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeoutMs = 300;

    socket.setTimeout(timeoutMs);

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.once("error", (error) => {
      if (
        error.code === "ECONNREFUSED" ||
        error.code === "EHOSTUNREACH" ||
        error.code === "ENETUNREACH" ||
        error.code === "EAFNOSUPPORT"
      ) {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

async function checkPortFree(port) {
  const results = await Promise.all([canConnect(port, "127.0.0.1"), canConnect(port, "::1")]);
  return !results.some(Boolean);
}

async function findFreePort() {
  const ranges = [
    [3000, 3100],
    [4000, 4100],
  ];

  for (const [start, end] of ranges) {
    for (let port = start; port <= end; port += 1) {
      if (await checkPortFree(port)) {
        return port;
      }
    }
  }

  return new Promise((resolve, reject) => {
    const tester = net.createServer();
    tester.once("error", (error) => reject(error));
    tester.listen(0, DEFAULT_HOST, () => {
      const address = tester.address();
      const port = typeof address === "object" && address ? address.port : null;
      tester.close(() => {
        if (port) {
          resolve(port);
        } else {
          reject(new Error("Failed to acquire a free port"));
        }
      });
    });
  });
}

async function promptForPort(options) {
  const { defaultPort, defaultLabel, historyPorts, reason, allowCustom, exitOption } = options;
  const { default: inquirer } = await import("inquirer");

  const messageText = chalk.cyanBright(reason);
  const choices = [];
  if (defaultPort) {
    const label = defaultLabel || "Use suggested port";
    choices.push({ name: chalk.cyanBright(`${label} ${defaultPort}`), value: defaultPort });
  }

  if (historyPorts.length > 0) {
    for (const port of historyPorts) {
      choices.push({ name: chalk.cyanBright(`Use port ${port}`), value: port });
    }
  }

  if (allowCustom) {
    choices.push({ name: chalk.cyanBright("Enter another port"), value: "custom" });
  }

  if (exitOption) {
    choices.push({ name: chalk.cyanBright("Exit"), value: "exit" });
  }

  const answer = await inquirer.prompt([
    {
      name: "portChoice",
      type: "list",
      message: messageText,
      choices,
    },
  ]);

  if (answer.portChoice === "exit") {
    return null;
  }

  if (answer.portChoice !== "custom") {
    return answer.portChoice;
  }

  const customAnswer = await inquirer.prompt([
    {
      name: "customPort",
      type: "input",
      message: chalk.cyanBright("Enter a port number:"),
      validate: (input) => {
        const value = Number(input);
        if (!Number.isInteger(value) || value <= 0 || value > 65535) {
          return "Please enter a valid port between 1 and 65535.";
        }
        return true;
      },
      filter: (input) => Number(input),
    },
  ]);

  return customAnswer.customPort;
}

async function resolvePort({ portSpecified, requestedPort, info }) {
  const historyPorts = Array.isArray(info?.ports) ? info.ports : [];
  const lastPort = typeof info?.lastPort === "number" ? info.lastPort : null;

  if (portSpecified) {
    if (await checkPortFree(requestedPort)) {
      return requestedPort;
    }

    if (!isInteractive()) {
      const suggested = await findFreePort();
      throw new Error(
        `Port ${requestedPort} is already in use. Try -p ${suggested} or another free port.`
      );
    }

    let port = await promptForPort({
      defaultPort: await findFreePort(),
      historyPorts: historyPorts.filter((value) => value !== requestedPort),
      reason: `Port ${requestedPort} is in use. Choose another port:`,
      allowCustom: true,
    });

    while (!(await checkPortFree(port))) {
      port = await promptForPort({
        defaultPort: await findFreePort(),
        historyPorts: historyPorts.filter((value) => value !== port),
        reason: `Port ${port} is still in use. Choose another port:`,
        allowCustom: true,
      });
    }

    return port;
  }

  if (info) {
    if (lastPort && (await checkPortFree(lastPort))) {
      if (!isInteractive()) {
        return lastPort;
      }

      const choice = await promptForPort({
        defaultPort: lastPort,
        defaultLabel: "Use last port",
        historyPorts: historyPorts.filter((value) => value !== lastPort),
        reason: `Use last port ${lastPort}?`,
        allowCustom: true,
      });

      if (await checkPortFree(choice)) {
        return choice;
      }
    }

    if (!isInteractive()) {
      return findFreePort();
    }

    if (lastPort) {
      const suggestedPort = await findFreePort();
      console.warn(
        `You last ran on port ${lastPort}, but it is currently in use. If you switch ports, you will not see the library saved on port ${lastPort}.`
      );
      const choice = await promptForPort({
        defaultPort: suggestedPort,
        defaultLabel: "Use suggested port",
        historyPorts: [],
        reason: "Use a suggested port or exit?",
        allowCustom: false,
        exitOption: true,
      });

      if (choice === null) {
        console.log("[heroquest-card-creator] Exiting without starting the server.");
        process.exit(0);
      }

      if (await checkPortFree(choice)) {
        return choice;
      }
    }

    const freeHistory = [];
    for (const port of historyPorts) {
      if (await checkPortFree(port)) {
        freeHistory.push(port);
      }
    }

    let port = await promptForPort({
      defaultPort: freeHistory.length === 0 ? await findFreePort() : null,
      historyPorts: freeHistory,
      reason: "Choose a port to run the app:",
      allowCustom: true,
    });

    if (port === null) {
      console.log("[heroquest-card-creator] Exiting without starting the server.");
      process.exit(0);
    }

    while (!(await checkPortFree(port))) {
      port = await promptForPort({
        defaultPort: await findFreePort(),
        historyPorts: freeHistory.filter((value) => value !== port),
        reason: `Port ${port} is in use. Choose another port:`,
        allowCustom: true,
      });

      if (port === null) {
        console.log("[heroquest-card-creator] Exiting without starting the server.");
        process.exit(0);
      }
    }

    return port;
  }

  if (await checkPortFree(DEFAULT_PORT)) {
    return DEFAULT_PORT;
  }

  return findFreePort();
}

function warnOnNewPort(port, info) {
  const historyPorts = Array.isArray(info?.ports) ? info.ports : [];
  if (historyPorts.includes(port)) {
    return;
  }

  if (historyPorts.length === 0) {
    console.warn(
      "[heroquest-card-creator] Note: Browser storage (IndexedDB/localStorage) is tied to the origin. Using a new port means you won’t see libraries saved on other ports."
    );
    return;
  }

  console.warn(
    `[heroquest-card-creator] Note: Browser storage (IndexedDB/localStorage) is tied to the origin. Using a new port means you won’t see libraries saved on other ports. Known ports: ${historyPorts.join(
      ", "
    )}.`
  );
}

async function main() {
  const args = process.argv.slice(2);
  const { port: requestedPort, portSpecified, help } = parseArgs(args);

  if (help) {
    printHelp();
    process.exit(0);
  }

  const rootDir = path.resolve(__dirname, "..", "out");

  if (!fs.existsSync(rootDir)) {
    console.error("[heroquest-card-creator] out/ directory not found. Run `npm run build` before packaging.");
    process.exit(1);
  }

  const info = loadInfo();

  let port;
  try {
    port = await resolvePort({ portSpecified, requestedPort, info });
  } catch (error) {
    console.error(`[heroquest-card-creator] ${error.message}`);
    process.exit(1);
  }

  warnOnNewPort(port, info);

  const server = createServer(rootDir);
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `[heroquest-card-creator] Port ${port} is already in use. Try a different port with -p.`
      );
    } else {
      console.error("[heroquest-card-creator] Server error:", error);
    }
    process.exit(1);
  });
  server.listen(port, DEFAULT_HOST, () => {
    saveInfo(port, info);
    const url = `http://${DEFAULT_HOST}:${port}`;
    console.log(`HeroQuest Card Creator ready at ${url}`);
    void promptOpenBrowser(url);
  });
}

main().catch((error) => {
  console.error("[heroquest-card-creator] Failed to start:", error);
  process.exit(1);
});
