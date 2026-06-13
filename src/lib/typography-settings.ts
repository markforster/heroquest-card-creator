"use client";

import { useLocalStorageBoolean } from "@/components/Providers/LocalStorageProvider";

export const TYPOGRAPHY_NUMERIC_STORAGE_KEYS = {
  titleAlignedNumerals: "hqcc.typography.titleAlignedNumerals",
  titleFixedWidthNumerals: "hqcc.typography.titleFixedWidthNumerals",
  statAlignedNumerals: "hqcc.typography.statAlignedNumerals",
  statFixedWidthNumerals: "hqcc.typography.statFixedWidthNumerals",
} as const;

export function useTypographyNumericSettings() {
  const [titleAlignedNumerals, setTitleAlignedNumerals] = useLocalStorageBoolean(
    TYPOGRAPHY_NUMERIC_STORAGE_KEYS.titleAlignedNumerals,
    true,
  );
  const [titleFixedWidthNumerals, setTitleFixedWidthNumerals] = useLocalStorageBoolean(
    TYPOGRAPHY_NUMERIC_STORAGE_KEYS.titleFixedWidthNumerals,
    true,
  );
  const [statAlignedNumerals, setStatAlignedNumerals] = useLocalStorageBoolean(
    TYPOGRAPHY_NUMERIC_STORAGE_KEYS.statAlignedNumerals,
    true,
  );
  const [statFixedWidthNumerals, setStatFixedWidthNumerals] = useLocalStorageBoolean(
    TYPOGRAPHY_NUMERIC_STORAGE_KEYS.statFixedWidthNumerals,
    true,
  );

  return {
    titleAlignedNumerals,
    setTitleAlignedNumerals,
    titleFixedWidthNumerals,
    setTitleFixedWidthNumerals,
    statAlignedNumerals,
    setStatAlignedNumerals,
    statFixedWidthNumerals,
    setStatFixedWidthNumerals,
  };
}
