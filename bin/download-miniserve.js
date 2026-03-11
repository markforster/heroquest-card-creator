#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const rootDir = path.join(__dirname, "..");
const artefactsDir = path.join(rootDir, "artefacts");
const outputDir = path.join(artefactsDir, "miniserve");
const cacheFile = path.join(outputDir, "manifest.json");
const repoApi = "https://api.github.com/repos/svenstaro/miniserve";
const fallbackTag = "v0.33.0";

const targetMatchers = [
  "aarch64-apple-darwin",
  "x86_64-apple-darwin",
  "x86_64-pc-windows-msvc",
  "windows-msvc",
  "x86_64-unknown-linux-gnu",
];

const excludedSuffixes = [".sha256", ".sig", ".tar.gz", ".zip"];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const headers = {
      "User-Agent": "hqcc-miniserve-downloader",
      Accept: "application/vnd.github+json",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    https
      .get(url, { headers }, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (err) {
              reject(err);
            }
            return;
          }
          reject(new Error(`Request failed: ${res.statusCode} ${res.statusMessage}`));
        });
      })
      .on("error", reject);
  });
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const headers = {
      "User-Agent": "hqcc-miniserve-downloader",
      Accept: "application/octet-stream",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    https
      .get(url, { headers }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadFile(res.headers.location, destination).then(resolve).catch(reject);
          return;
        }

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Download failed: ${res.statusCode} ${res.statusMessage}`));
          return;
        }

        const file = fs.createWriteStream(destination);
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", reject);
      })
      .on("error", reject);
  });
}

function isExcluded(name) {
  return excludedSuffixes.some((suffix) => name.endsWith(suffix));
}

function matchesTarget(name) {
  return targetMatchers.some((matcher) => name.includes(matcher));
}

async function resolveRelease() {
  if (process.env.MINISERVE_VERSION) {
    const tag = process.env.MINISERVE_VERSION.startsWith("v")
      ? process.env.MINISERVE_VERSION
      : `v${process.env.MINISERVE_VERSION}`;
    return fetchJson(`${repoApi}/releases/tags/${tag}`).catch((err) => {
      console.warn(`[download-miniserve] Failed to fetch ${tag}: ${err.message}`);
      return null;
    });
  }

  return fetchJson(`${repoApi}/releases/latest`).catch((err) => {
    console.warn(`[download-miniserve] Failed to fetch latest release: ${err.message}`);
    return null;
  });
}

function loadCache() {
  if (!fs.existsSync(cacheFile)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(cacheFile, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function saveCache(tag, assets) {
  const payload = {
    tag,
    assets,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(cacheFile, JSON.stringify(payload, null, 2), "utf8");
}

function allAssetsPresent(assets) {
  return assets.every((name) => fs.existsSync(path.join(outputDir, name)));
}

async function main() {
  if (!fs.existsSync(artefactsDir)) {
    fs.mkdirSync(artefactsDir, { recursive: true });
  }
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let release = await resolveRelease();
  if (!release) {
    console.warn(`[download-miniserve] Falling back to ${fallbackTag}`);
    release = await fetchJson(`${repoApi}/releases/tags/${fallbackTag}`);
  }

  const tagName = release.tag_name || fallbackTag;

  const assets = Array.isArray(release.assets) ? release.assets : [];
  const candidates = assets.filter((asset) => {
    const name = asset.name || "";
    return name && matchesTarget(name) && !isExcluded(name);
  });

  if (candidates.length === 0) {
    throw new Error("No matching miniserve assets found.");
  }

  const prefixedAssets = candidates.map((asset) => `miniserve-hqcc-${asset.name}`);
  const cache = loadCache();
  if (cache && cache.tag === tagName && allAssetsPresent(prefixedAssets)) {
    console.log(`[download-miniserve] ${tagName} already downloaded. Skipping.`);
    return;
  }

  for (const asset of candidates) {
    const name = asset.name;
    const url = asset.browser_download_url;
    if (!name || !url) {
      continue;
    }
    const prefixedName = `miniserve-hqcc-${name}`;
    const destination = path.join(outputDir, prefixedName);
    console.log(`[download-miniserve] Downloading ${name} -> ${prefixedName}`);
    await downloadFile(url, destination);
    if (!prefixedName.endsWith(".exe")) {
      try {
        fs.chmodSync(destination, 0o755);
      } catch (err) {
        console.warn(`[download-miniserve] Failed to chmod ${prefixedName}: ${err.message}`);
      }
    }
  }

  saveCache(tagName, prefixedAssets);

  console.log("[download-miniserve] Done.");
}

main().catch((err) => {
  console.error(`[download-miniserve] ${err.message}`);
  process.exit(1);
});
