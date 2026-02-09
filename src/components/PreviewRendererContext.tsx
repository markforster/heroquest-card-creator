"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { SHOW_WEBGL_TOGGLE, USE_WEBGL_PREVIEW } from "@/config/flags";

export type PreviewRenderer = "svg" | "webgl";

type PreviewRendererContextValue = {
  previewRenderer: PreviewRenderer;
  setPreviewRenderer: (renderer: PreviewRenderer) => void;
  togglePreviewRenderer: () => void;
};

const PREVIEW_RENDERER_STORAGE_KEY = "hqcc.previewRenderer";
const FORCED_RENDERER: PreviewRenderer | null = USE_WEBGL_PREVIEW ? "webgl" : null;

const PreviewRendererContext = createContext<PreviewRendererContextValue | null>(null);

export function PreviewRendererProvider({ children }: { children: React.ReactNode }) {
  const [previewRenderer, setPreviewRenderer] = useState<PreviewRenderer>(FORCED_RENDERER ?? "svg");

  useEffect(() => {
    if (FORCED_RENDERER) {
      setPreviewRenderer(FORCED_RENDERER);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(PREVIEW_RENDERER_STORAGE_KEY);
      if (stored === "svg" || stored === "webgl") {
        setPreviewRenderer(stored);
      }
    } catch {
      // Ignore localStorage errors.
    }
  }, []);

  useEffect(() => {
    if (FORCED_RENDERER) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PREVIEW_RENDERER_STORAGE_KEY, previewRenderer);
    } catch {
      // Ignore localStorage errors.
    }
  }, [previewRenderer]);

  const value = useMemo<PreviewRendererContextValue>(
    () => ({
      previewRenderer,
      setPreviewRenderer: (renderer) => {
        if (FORCED_RENDERER) return;
        setPreviewRenderer(renderer);
      },
      togglePreviewRenderer: () => {
        if (FORCED_RENDERER) return;
        setPreviewRenderer((prev) => (prev === "svg" ? "webgl" : "svg"));
      },
    }),
    [previewRenderer],
  );

  return (
    <PreviewRendererContext.Provider value={value}>
      {children}
    </PreviewRendererContext.Provider>
  );
}

export function usePreviewRenderer(): PreviewRendererContextValue {
  const context = useContext(PreviewRendererContext);
  if (!context) {
    throw new Error("usePreviewRenderer must be used within PreviewRendererProvider");
  }
  return context;
}

export const previewRendererFlags = {
  SHOW_WEBGL_TOGGLE,
  USE_WEBGL_PREVIEW,
};
