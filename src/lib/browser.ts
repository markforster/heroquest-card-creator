"use client";

export function getLocationOriginInfo(): { origin: string; isFileProtocol: boolean } {
  return {
    origin: window.location.origin,
    isFileProtocol: window.location.protocol === "file:",
  };
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
}

export function normalizeFileProtocolAssetUrl(src: string): string {
  if (typeof window === "undefined") return src;
  if (window.location.protocol !== "file:") return src;
  if (!src.startsWith("/")) return src;
  return `.${src}`;
}

export function buildAppHashUrl(path: string): string {
  if (typeof window === "undefined") return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (window.location.protocol === "file:") {
    return `${window.location.pathname}#${normalizedPath}`;
  }
  return `${window.location.origin}${window.location.pathname}#${normalizedPath}`;
}
