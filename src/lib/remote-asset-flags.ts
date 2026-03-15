"use client";

import { readApiConfig } from "@/api/config";

const THUMB_PREFETCH_KEY = "hqcc.remote.assetThumbPrefetchEnabled";
const HASH_INDEX_KEY = "hqcc.remote.assetHashIndexEnabled";
const EVENT_NAME = "hqcc.remote.assetFlags";

function isRemoteMode(): boolean {
  try {
    return readApiConfig().mode === "remote";
  } catch {
    return false;
  }
}

function parseStoredBoolean(raw: string | null): boolean | null {
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return null;
}

function readRemoteFlag(key: string, defaultWhenRemote: boolean): boolean {
  if (typeof window === "undefined") return true;
  if (!isRemoteMode()) return true;
  try {
    const parsed = parseStoredBoolean(window.localStorage.getItem(key));
    if (parsed != null) return parsed;
  } catch {
    // Ignore localStorage errors.
  }
  return defaultWhenRemote;
}

function writeRemoteFlag(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // Ignore localStorage errors.
  }
}

export function getRemoteAssetThumbPrefetchEnabled(): boolean {
  return readRemoteFlag(THUMB_PREFETCH_KEY, false);
}

export function setRemoteAssetThumbPrefetchEnabled(value: boolean): void {
  writeRemoteFlag(THUMB_PREFETCH_KEY, value);
}

export function getRemoteAssetHashIndexEnabled(): boolean {
  return readRemoteFlag(HASH_INDEX_KEY, false);
}

export function setRemoteAssetHashIndexEnabled(value: boolean): void {
  writeRemoteFlag(HASH_INDEX_KEY, value);
}

export function subscribeRemoteAssetFlags(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
