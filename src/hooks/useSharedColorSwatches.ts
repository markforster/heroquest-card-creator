"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getBorderSwatches, setBorderSwatches } from "@/lib/settings-db";

const MAX_SWATCHES = 10;
const DEFAULT_BORDER_COLOR = "#310101";

export function useSharedColorSwatches() {
  const [swatches, setSwatches] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    getBorderSwatches()
      .then((values) => {
        if (!active) return;
        setSwatches(values.filter((value) => typeof value === "string"));
      })
      .catch(() => {
        if (!active) return;
        setSwatches([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const normalizedSwatches = useMemo(
    () => swatches.map((swatch) => swatch.trim()).filter(Boolean),
    [swatches],
  );

  const saveSwatch = useCallback(
    async (value: string) => {
      const normalized = value.trim().toUpperCase();
      if (!normalized) return;
      if (isTransparentColor(normalized)) return;
      if (normalized === DEFAULT_BORDER_COLOR.toUpperCase()) return;
      const exists = normalizedSwatches.some(
        (swatch) => swatch.toUpperCase() === normalized,
      );
      if (exists) return;
      const capped = normalizedSwatches.filter(
        (swatch) => swatch.toUpperCase() !== DEFAULT_BORDER_COLOR.toUpperCase(),
      );
      const next = [...capped, normalized].slice(-MAX_SWATCHES);
      setSwatches(next);
      try {
        await setBorderSwatches(next);
      } catch {
        // Ignore persistence errors; UI still reflects latest swatches.
      }
    },
    [normalizedSwatches],
  );

  const removeSwatch = useCallback(
    async (value: string) => {
      const normalized = value.trim().toUpperCase();
      const next = normalizedSwatches.filter(
        (swatch) => swatch.toUpperCase() !== normalized,
      );
      setSwatches(next);
      try {
        await setBorderSwatches(next);
      } catch {
        // Ignore persistence errors; UI still reflects latest swatches.
      }
    },
    [normalizedSwatches],
  );

  return {
    swatches: normalizedSwatches,
    saveSwatch,
    removeSwatch,
    maxSwatches: MAX_SWATCHES,
  };
}

function isTransparentColor(value?: string) {
  if (!value) return false;
  if (value.trim().toLowerCase() === "transparent") return true;
  if (/^#?[0-9a-fA-F]{8}$/.test(value)) {
    const raw = value.startsWith("#") ? value.slice(1) : value;
    return raw.slice(6, 8).toLowerCase() === "00";
  }
  if (/^#?[0-9a-fA-F]{4}$/.test(value)) {
    const raw = value.startsWith("#") ? value.slice(1) : value;
    return raw.slice(3, 4).toLowerCase() === "0";
  }
  return false;
}
