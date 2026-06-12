import { formatHexColor, isTransparentHex, parseHexColor } from "@/lib/color";

export type NormalizeInspectorColorOptions = {
  defaultColor: string;
  transparentValue: string;
};

export function normalizeHexValue(value: string | undefined): string | null {
  const parsed = parseHexColor(value);
  if (!parsed) return null;
  return formatHexColor(parsed, { alphaMode: "preserve", case: "upper" });
}

export function isTransparentColor(
  value: string | undefined,
  transparentValue: string,
): boolean {
  if (!value) return false;
  if (value.trim().toLowerCase() === transparentValue.toLowerCase()) return true;
  return isTransparentHex(value);
}

export function normalizeInspectorColor(
  value: string | undefined,
  options: NormalizeInspectorColorOptions,
): string {
  if (isTransparentColor(value, options.transparentValue)) {
    return options.transparentValue;
  }
  return normalizeHexValue(value) ?? options.defaultColor;
}

export function hasInspectorColorRevert(
  current: string,
  saved: string | undefined,
  options: NormalizeInspectorColorOptions,
): boolean {
  const normalizedCurrent = normalizeInspectorColor(current, options);
  const normalizedSaved = normalizeInspectorColor(saved, options);
  return normalizedCurrent !== normalizedSaved;
}
