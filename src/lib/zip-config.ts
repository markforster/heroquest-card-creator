"use client";

import { configure } from "@zip.js/zip.js";

let configuredMode: "worker" | "fallback" | null = null;

export const configureZipJs = (useWebWorkers: boolean) => {
  const mode: "worker" | "fallback" = useWebWorkers ? "worker" : "fallback";
  if (configuredMode === mode) return;

  configure({
    workerURI: "./zip/zip-web-worker.js",
    maxWorkers: 2,
    useWebWorkers,
  });

  configuredMode = mode;
};
