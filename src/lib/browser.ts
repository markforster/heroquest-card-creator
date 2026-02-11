"use client";

export function getLocationOriginInfo(): { origin: string; isFileProtocol: boolean } {
  return {
    origin: window.location.origin,
    isFileProtocol: window.location.protocol === "file:",
  };
}
