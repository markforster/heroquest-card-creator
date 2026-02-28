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
