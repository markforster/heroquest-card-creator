type ParsedHexColor = {
  hex: string;
  hexWithAlpha: string;
  alpha: number;
  inputHasAlpha: boolean;
  isTransparent: boolean;
};

type ParseHexColorOptions = {
  allowTransparent?: boolean;
};

type HexCase = "upper" | "lower";
type AlphaMode = "preserve" | "force" | "strip";

type FormatHexColorOptions = {
  alphaMode?: AlphaMode;
  case?: HexCase;
};

type FormatCssColorOptions = {
  case?: HexCase;
};

const HEX_PATTERN = /^[0-9a-fA-F]+$/;

export function isTransparentHex(
  value: string | undefined,
  options: { allowTransparentString?: boolean } = {},
): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (options.allowTransparentString && trimmed.toLowerCase() === "transparent") return true;
  const parsed = parseHexColor(trimmed);
  if (!parsed || !parsed.inputHasAlpha) return false;
  return parsed.hexWithAlpha.slice(7, 9) === "00";
}

export function parseHexColor(
  value: string | undefined,
  options: ParseHexColorOptions = {},
): ParsedHexColor | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (options.allowTransparent && lower === "transparent") {
    return {
      hex: "#000000",
      hexWithAlpha: "#00000000",
      alpha: 0,
      inputHasAlpha: true,
      isTransparent: true,
    };
  }

  const raw = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!raw || !HEX_PATTERN.test(raw)) return null;

  if (raw.length !== 3 && raw.length !== 4 && raw.length !== 6 && raw.length !== 8) {
    return null;
  }

  const inputHasAlpha = raw.length === 4 || raw.length === 8;
  const expanded =
    raw.length === 3 || raw.length === 4
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;

  const hex = `#${expanded.slice(0, 6).toUpperCase()}`;
  const alphaHex = inputHasAlpha ? expanded.slice(6, 8) : "FF";
  const hexWithAlpha = `#${expanded.slice(0, 6).toUpperCase()}${alphaHex.toUpperCase()}`;
  const alpha = Number.parseInt(alphaHex, 16) / 255;

  return {
    hex,
    hexWithAlpha,
    alpha,
    inputHasAlpha,
    isTransparent: false,
  };
}

export function formatHexColor(
  parsed: ParsedHexColor,
  options: FormatHexColorOptions = {},
): string {
  const alphaMode = options.alphaMode ?? "preserve";
  const casing = options.case ?? "upper";

  let value = parsed.hex;
  if (alphaMode === "force") {
    value = parsed.hexWithAlpha;
  } else if (alphaMode === "strip") {
    value = parsed.hex;
  } else if (parsed.inputHasAlpha || parsed.isTransparent) {
    value = parsed.hexWithAlpha;
  }

  return casing === "lower" ? value.toLowerCase() : value.toUpperCase();
}

export function formatCssColor(
  parsed: ParsedHexColor,
  options: FormatCssColorOptions = {},
): string {
  if (parsed.inputHasAlpha) {
    const hex = parsed.hexWithAlpha.slice(1);
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${parsed.alpha.toFixed(3)})`;
  }

  const casing = options.case ?? "upper";
  return casing === "lower" ? parsed.hex.toLowerCase() : parsed.hex.toUpperCase();
}
