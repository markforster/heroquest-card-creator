"use client";

import { useMemo } from "react";

export function useIsMac() {
  return useMemo(
    () => typeof navigator !== "undefined" && navigator.platform.includes("Mac"),
    [],
  );
}
