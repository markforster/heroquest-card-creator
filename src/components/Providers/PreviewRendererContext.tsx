"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { SHOW_WEBGL_TOGGLE, USE_WEBGL_PREVIEW } from "@/config/flags";

export type PreviewRenderer = "svg" | "webgl";
export type PreviewRotationMode = "pan" | "spin";

type PreviewRendererContextValue = {
  previewRenderer: PreviewRenderer;
  setPreviewRenderer: (renderer: PreviewRenderer) => void;
  togglePreviewRenderer: () => void;
  rotationMode: PreviewRotationMode;
  setRotationMode: (mode: PreviewRotationMode) => void;
  rotationResetToken: number;
  recenterToken: number;
  requestRecenter: () => void;
};

const PREVIEW_RENDERER_STORAGE_KEY = "hqcc.previewRenderer";
const PREVIEW_RENDERER_SETTINGS_KEY = "hqcc.previewRendererSettings";
const FORCED_RENDERER: PreviewRenderer | null = USE_WEBGL_PREVIEW ? "webgl" : null;

const PreviewRendererContext = createContext<PreviewRendererContextValue | null>(null);

export function PreviewRendererProvider({ children }: { children: React.ReactNode }) {
  const [previewRenderer, setPreviewRenderer] = useState<PreviewRenderer>(FORCED_RENDERER ?? "svg");
  const [rotationMode, setRotationMode] = useState<PreviewRotationMode>("pan");
  const [rotationResetToken, setRotationResetToken] = useState(0);
  const [recenterToken, setRecenterToken] = useState(0);

  useEffect(() => {
    if (FORCED_RENDERER) {
      setPreviewRenderer(FORCED_RENDERER);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const storedSettings = window.localStorage.getItem(PREVIEW_RENDERER_SETTINGS_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings) as {
          renderer?: PreviewRenderer;
          rotationMode?: PreviewRotationMode;
        };
        if (parsed.renderer === "svg" || parsed.renderer === "webgl") {
          setPreviewRenderer(parsed.renderer);
        }
        if (parsed.rotationMode === "pan" || parsed.rotationMode === "spin") {
          setRotationMode(parsed.rotationMode);
        }
        return;
      }

      const storedRenderer = window.localStorage.getItem(PREVIEW_RENDERER_STORAGE_KEY);
      if (storedRenderer === "svg" || storedRenderer === "webgl") {
        setPreviewRenderer(storedRenderer);
      }
    } catch {
      // Ignore localStorage errors.
    }
  }, []);

  useEffect(() => {
    if (FORCED_RENDERER) return;
    if (typeof window === "undefined") return;
    try {
      const payload = JSON.stringify({
        renderer: previewRenderer,
        rotationMode,
      });
      window.localStorage.setItem(PREVIEW_RENDERER_SETTINGS_KEY, payload);
      window.localStorage.setItem(PREVIEW_RENDERER_STORAGE_KEY, previewRenderer);
    } catch {
      // Ignore localStorage errors.
    }
  }, [previewRenderer, rotationMode]);

  const value = useMemo<PreviewRendererContextValue>(
    () => ({
      previewRenderer,
      setPreviewRenderer: (renderer) => {
        if (FORCED_RENDERER) return;
        setPreviewRenderer(renderer);
        if (renderer === "svg") {
          setRotationResetToken((prev) => prev + 1);
        }
      },
      togglePreviewRenderer: () => {
        if (FORCED_RENDERER) return;
        setPreviewRenderer((prev) => {
          const next = prev === "svg" ? "webgl" : "svg";
          if (next === "svg") {
            setRotationResetToken((current) => current + 1);
          }
          return next;
        });
      },
      rotationMode,
      setRotationMode: (mode) => {
        setRotationMode(mode);
      },
      rotationResetToken,
      recenterToken,
      requestRecenter: () => {
        setRecenterToken((prev) => prev + 1);
      },
    }),
    [previewRenderer, rotationMode, rotationResetToken, recenterToken],
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
