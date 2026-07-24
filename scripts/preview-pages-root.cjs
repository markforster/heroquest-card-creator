const { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const mime = require("mime");

const repoRoot = path.resolve(__dirname, "..");
const pagesPlaceholderRoot = path.join(repoRoot, ".github", "pages-placeholder");
const builtHelpRoot = path.join(repoRoot, "help-site", "site");

function makePreviewSiteRoot() {
  if (!existsSync(builtHelpRoot)) {
    console.error("Missing help-site/site. This branch previews the checked-in help output, so that folder must exist.");
    process.exit(1);
  }

  const previewRoot = mkdtempSync(path.join(os.tmpdir(), "hqcc-main-pages-preview-"));
  const siteRoot = path.join(previewRoot, "site");

  cpSync(pagesPlaceholderRoot, siteRoot, { recursive: true });
  rmSync(path.join(siteRoot, "help"), { recursive: true, force: true });
  cpSync(builtHelpRoot, path.join(siteRoot, "help"), { recursive: true });

  return siteRoot;
}

function sendFile(response, filePath) {
  const contentType = mime.getType(filePath) || "application/octet-stream";
  response.writeHead(200, { "Content-Type": contentType });
  response.end(readFileSync(filePath));
}

function findAvailablePort(startPort, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const tester = http.createServer();

      tester.once("error", (error) => {
        tester.close(() => {
          if (error && error.code === "EADDRINUSE") {
            tryPort(port + 1);
            return;
          }

          reject(error);
        });
      });

      tester.once("listening", () => {
        tester.close(() => resolve(port));
      });

      tester.listen(port, host);
    };

    tryPort(startPort);
  });
}

function serveStaticRoot(rootDir, port) {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
    const safePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
    const candidatePath = path.normalize(path.join(rootDir, safePath));

    if (!candidatePath.startsWith(rootDir)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const indexPath = path.join(candidatePath, "index.html");

    if (existsSync(candidatePath) && require("fs").statSync(candidatePath).isFile()) {
      sendFile(response, candidatePath);
      return;
    }

    if (existsSync(indexPath)) {
      sendFile(response, indexPath);
      return;
    }

    response.writeHead(404);
    response.end("Not Found");
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`Previewing GitHub Pages root at http://127.0.0.1:${port}/`);
    console.log(`Help site remains available at http://127.0.0.1:${port}/help/`);
    console.log(`Serving files from ${rootDir}`);
    console.log("Press Ctrl+C to stop the local preview server.");
  });

  const shutdown = () => {
    server.close(() => {
      console.log("Local preview server stopped.");
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

async function main() {
  const siteRoot = makePreviewSiteRoot();
  const port = await findAvailablePort(8010);
  serveStaticRoot(siteRoot, port);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
