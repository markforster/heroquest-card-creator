export const BACKGROUND_TINT_BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
] as const;

export type BackgroundTintBlendMode = (typeof BACKGROUND_TINT_BLEND_MODES)[number];

export const DEFAULT_BACKGROUND_TINT_BLEND_MODE: BackgroundTintBlendMode = "multiply";

export function normalizeBackgroundTintBlendModeForStorage(
  value: BackgroundTintBlendMode | undefined,
): BackgroundTintBlendMode | undefined {
  return value && value !== DEFAULT_BACKGROUND_TINT_BLEND_MODE ? value : undefined;
}
