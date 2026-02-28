"use client";

import { useRef, useState } from "react";

import { getPaletteGroups } from "@/lib/palette";

type SmartGroup = {
  id: "dominant" | "vibrant" | "muted" | "dark" | "light" | "complementary";
  colors: string[];
};

type UseSmartSwatchesArgs = {
  renderPreviewCanvas: (args: { width: number; height: number }) => Promise<HTMLCanvasElement | null>;
  width: number;
  height: number;
};

type UseSmartSwatchesResult = {
  smartGroups: SmartGroup[];
  isSmartBusy: boolean;
  requestSmart: () => Promise<void>;
};

export function useSmartSwatches({
  renderPreviewCanvas,
  width,
  height,
}: UseSmartSwatchesArgs): UseSmartSwatchesResult {
  const [smartGroups, setSmartGroups] = useState<SmartGroup[]>([]);
  const [isSmartBusy, setIsSmartBusy] = useState(false);
  const smartRequestRef = useRef(0);

  const requestSmart = async () => {
    const requestId = smartRequestRef.current + 1;
    smartRequestRef.current = requestId;
    setIsSmartBusy(true);

    try {
      const canvas = await renderPreviewCanvas({ width, height });
      if (!canvas || smartRequestRef.current !== requestId) return;

      const palette = await getPaletteGroups(canvas, { width, height });
      if (smartRequestRef.current !== requestId) return;
      setSmartGroups(palette);
    } catch {
      if (smartRequestRef.current !== requestId) return;
      setSmartGroups([]);
    } finally {
      if (smartRequestRef.current === requestId) {
        setIsSmartBusy(false);
      }
    }
  };

  return { smartGroups, isSmartBusy, requestSmart };
}
