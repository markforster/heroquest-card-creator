"use client";

import { createContext, useCallback, useContext, useMemo } from "react";

import type { CardPreviewHandle } from "@/components/CardPreview";

import type { ReactNode, RefObject } from "react";

type PreviewCanvasContextValue = {
  renderPreviewCanvas: (options?: { width?: number; height?: number }) => Promise<HTMLCanvasElement | null>;
};

const PreviewCanvasContext = createContext<PreviewCanvasContextValue | undefined>(undefined);

type PreviewCanvasProviderProps = {
  previewRef: RefObject<CardPreviewHandle>;
  children: ReactNode;
};

export function PreviewCanvasProvider({ previewRef, children }: PreviewCanvasProviderProps) {
  const renderPreviewCanvas = useCallback(
    async (options?: { width?: number; height?: number }) => {
      const handle = previewRef.current;
      if (!handle) return null;
      return handle.renderToCanvas(options);
    },
    [previewRef],
  );

  const value = useMemo(
    () => ({
      renderPreviewCanvas,
    }),
    [renderPreviewCanvas],
  );

  return <PreviewCanvasContext.Provider value={value}>{children}</PreviewCanvasContext.Provider>;
}

export function usePreviewCanvas() {
  const ctx = useContext(PreviewCanvasContext);
  if (!ctx) {
    throw new Error("usePreviewCanvas must be used within a PreviewCanvasProvider");
  }
  return ctx;
}
