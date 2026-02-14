"use client";

import { useEffect, useMemo } from "react";

import type { PreviewRenderer } from "@/components/PreviewRendererContext";
import { supportsWebgl } from "@/lib/webgl";

export function useWebglSupport(
  previewRenderer: PreviewRenderer,
  setPreviewRenderer: (renderer: PreviewRenderer) => void,
): boolean {
  const isWebglSupported = useMemo(() => supportsWebgl(), []);

  useEffect(() => {
    if (!isWebglSupported && previewRenderer === "webgl") {
      setPreviewRenderer("svg");
    }
  }, [isWebglSupported, previewRenderer, setPreviewRenderer]);

  return isWebglSupported;
}
