"use client";

import { configure } from "@zip.js/zip.js";

let configuredMode: "worker" | "fallback" | null = null;
let configuredWorkerUri: string | null = null;
let workerPreflightResult: "worker" | "fallback" | null = null;

const resolveWorkerUri = () => {
  if (configuredWorkerUri) return configuredWorkerUri;
  if (typeof document === "undefined") {
    configuredWorkerUri = "./zip/zip-web-worker.js";
    return configuredWorkerUri;
  }
  configuredWorkerUri = new URL("zip/zip-web-worker.js", document.baseURI).toString();
  return configuredWorkerUri;
};

const isFileProtocol = () => {
  if (typeof document === "undefined") return false;
  try {
    return new URL(document.baseURI).protocol === "file:";
  } catch {
    return false;
  }
};

const canUseWorkers = (workerUri: string) => {
  if (workerPreflightResult) return workerPreflightResult === "worker";
  try {
    const worker = new Worker(workerUri, { type: "module" });
    worker.terminate();
    workerPreflightResult = "worker";
    return true;
  } catch {
    workerPreflightResult = "fallback";
    return false;
  }
};

export const configureZipJs = (useWebWorkers: boolean) => {
  const workerUri = resolveWorkerUri();
  const allowWorkers =
    !isFileProtocol() && useWebWorkers ? canUseWorkers(workerUri) : false;
  const mode: "worker" | "fallback" = allowWorkers ? "worker" : "fallback";
  if (configuredMode === mode) return;

  configure({
    workerURI: workerUri,
    maxWorkers: 2,
    useWebWorkers: allowWorkers,
  });

  configuredMode = mode;
};
