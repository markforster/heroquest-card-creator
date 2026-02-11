"use client";

let cachedSupport: boolean | null = null;

export function supportsWebgl(): boolean {
  if (cachedSupport !== null) {
    return cachedSupport;
  }
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    cachedSupport = Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl"),
    );
    return cachedSupport;
  } catch {
    cachedSupport = false;
    return false;
  }
}
