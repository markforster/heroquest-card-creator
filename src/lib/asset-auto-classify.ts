"use client";

const STORAGE_KEY = "hqcc.assetAutoClassifyEnabled";

export function getAssetAutoClassifyEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "0" || stored === "false") return false;
  } catch {
    // Ignore localStorage errors.
  }
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
