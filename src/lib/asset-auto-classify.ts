"use client";

import { readApiConfig } from "@/api/config";

const STORAGE_KEY = "hqcc.assetAutoClassifyEnabled";

export function getAssetAutoClassifyEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "0" || stored === "false") return false;
    if (stored === "1" || stored === "true") return true;
  } catch {
    // Ignore localStorage errors.
  }

  const apiConfig = readApiConfig();
  if (apiConfig.mode === "remote") return false;
  return true;
}

export function setAssetAutoClassifyEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Ignore localStorage errors.
  }
}
