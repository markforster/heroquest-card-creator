import combatAdUrl from "@/assets/dice/combat_ad.svg?url";
import combatCdUrl from "@/assets/dice/combat_cd.svg?url";
import combatDdUrl from "@/assets/dice/combat_dd.svg?url";
import combatMdUrl from "@/assets/dice/combat_md.svg?url";
import combatMonsterUrl from "@/assets/dice/combat_monster_white.svg?url";
import combatShieldUrl from "@/assets/dice/combat_shield_white.svg?url";
import combatSkullUrl from "@/assets/dice/combat_skull_white.svg?url";
import d6Pips1Url from "@/assets/dice/d6_pips_1.svg?url";
import d6Pips2Url from "@/assets/dice/d6_pips_2.svg?url";
import d6Pips3Url from "@/assets/dice/d6_pips_3.svg?url";
import d6Pips4Url from "@/assets/dice/d6_pips_4.svg?url";
import d6Pips5Url from "@/assets/dice/d6_pips_5.svg?url";
import d6Pips6Url from "@/assets/dice/d6_pips_6.svg?url";
import { formatCssColor, formatHexColor, parseHexColor } from "@/lib/color";

export type CombatFace = "skull" | "hero" | "monster" | "cd" | "ad" | "dd" | "md";
export type D6Face = 1 | 2 | 3 | 4 | 5 | 6;
export type IconDiceFace = "skull" | "hero" | "monster";
export type DetailDiceFace = "cd" | "ad" | "dd" | "md";
export type InlineDiceConfiguratorType = "d6" | "icon" | "detail";
export type InlineDiceConfiguratorValue = D6Face | IconDiceFace | DetailDiceFace;

export type InlineDiceConfiguratorState = {
  type: InlineDiceConfiguratorType;
  faceOrValue: InlineDiceConfiguratorValue;
  backgroundColor: string;
  symbolColor: string;
};

export type InlineDiceToken = {
  kind: "dice";
  type: "combat" | "d6";
  face: CombatFace | D6Face;
  color: string;
  faceColor: string;
  svgUrl: string;
};

export type InlineDiceSegment =
  | { kind: "text"; text: string }
  | { kind: "dice"; token: InlineDiceToken };

export const DICE_COLORS: Record<string, string> = {
  white: "#ffffff",
  black: "#111111",
  red: "#b21d1d",
  blue: "#1c4aa8",
  green: "#1f7a3b",
  yellow: "#d6a600",
  orange: "#d0761a",
  purple: "#6b3fa0",
  grey: "#6b6b6b",
};

export const INLINE_DICE_PRESET_COLORS = Object.values(DICE_COLORS).map((value) =>
  value.toUpperCase(),
);
export const ICON_DICE_FACES: readonly IconDiceFace[] = ["skull", "hero", "monster"];
export const DETAIL_DICE_FACES: readonly DetailDiceFace[] = ["cd", "ad", "dd", "md"];
export const D6_FACES: readonly D6Face[] = [1, 2, 3, 4, 5, 6];

const DICE_FACE_COLORS: Record<string, string> = {
  white: "#111111",
  black: "#ffffff",
  red: "#ffffff",
  blue: "#ffffff",
  green: "#ffffff",
  yellow: "#ffffff",
  orange: "#ffffff",
  purple: "#ffffff",
  grey: "#ffffff",
};

const COMBAT_FACE_MAP: Record<string, CombatFace> = {
  skull: "skull",
  hero: "hero",
  shield: "hero",
  monster: "monster",
  cd: "cd",
  ad: "ad",
  dd: "dd",
  md: "md",
};

const COMBAT_FACE_SHORT_MAP: Record<string, CombatFace> = {
  s: "skull",
  h: "hero",
  m: "monster",
  cd: "cd",
  ad: "ad",
  dd: "dd",
  md: "md",
};

const COLOR_SHORT_MAP: Record<string, string> = {
  w: "white",
  bk: "black",
  r: "red",
  bl: "blue",
  g: "green",
  y: "yellow",
  o: "orange",
  p: "purple",
  gy: "grey",
};

const COMBAT_SVG_MAP: Record<CombatFace, string> = {
  skull: combatSkullUrl,
  hero: combatShieldUrl,
  monster: combatMonsterUrl,
  cd: combatCdUrl,
  ad: combatAdUrl,
  dd: combatDdUrl,
  md: combatMdUrl,
};

const D6_SVG_MAP: Record<D6Face, string> = {
  1: d6Pips1Url,
  2: d6Pips2Url,
  3: d6Pips3Url,
  4: d6Pips4Url,
  5: d6Pips5Url,
  6: d6Pips6Url,
};

const ICON_FACE_CODE_MAP: Record<IconDiceFace, string> = {
  skull: "s",
  hero: "h",
  monster: "m",
};

const DETAIL_FACE_CODE_MAP: Record<DetailDiceFace, string> = {
  cd: "cd",
  ad: "ad",
  dd: "dd",
  md: "md",
};

const COLOR_CANONICAL_SHORT_MAP: Record<string, string> = Object.entries(COLOR_SHORT_MAP).reduce<
  Record<string, string>
>((acc, [short, long]) => {
  if (!acc[long]) {
    acc[long] = short;
  }
  return acc;
}, {});

export function getInlineDiceSvgUrl(
  type: InlineDiceConfiguratorType,
  faceOrValue: InlineDiceConfiguratorValue,
): string {
  if (type === "d6") {
    return D6_SVG_MAP[faceOrValue as D6Face];
  }
  return COMBAT_SVG_MAP[faceOrValue as CombatFace];
}

export function normalizeInlineDiceColorInput(raw?: string): string | null {
  if (!raw) return null;

  const parsed = parseHexColor(raw);
  if (parsed) {
    return formatHexColor(parsed, {
      alphaMode: parsed.inputHasAlpha ? "preserve" : "strip",
      case: "upper",
    });
  }

  const resolvedKey = resolveColorKey(raw.trim().toLowerCase());
  const color = DICE_COLORS[resolvedKey];
  return color ? color.toUpperCase() : null;
}

export function getInlineDiceDefaultSymbolColor(backgroundColor: string): string {
  const normalized = normalizeInlineDiceColorInput(backgroundColor) ?? DICE_COLORS.white.toUpperCase();
  const colorKey = resolveInlineDicePaletteKey(normalized) ?? "white";

  return (DICE_FACE_COLORS[colorKey] ?? DICE_FACE_COLORS.white).toUpperCase();
}

function formatInlineDiceColorToken(raw: string): string | null {
  const normalized = normalizeInlineDiceColorInput(raw);
  if (!normalized) return null;

  const paletteKey = resolveInlineDicePaletteKey(normalized);
  if (paletteKey) {
    return COLOR_CANONICAL_SHORT_MAP[paletteKey] ?? paletteKey;
  }

  const parsed = parseHexColor(normalized);
  if (!parsed) return null;
  return formatHexColor(parsed, {
    alphaMode: parsed.inputHasAlpha ? "preserve" : "strip",
    case: "lower",
  });
}

export function buildInlineDiceToken(config: InlineDiceConfiguratorState): string {
  const backgroundToken = formatInlineDiceColorToken(config.backgroundColor) ?? "w";
  const defaultSymbolColor = getInlineDiceDefaultSymbolColor(config.backgroundColor);
  const symbolToken = formatInlineDiceColorToken(config.symbolColor);
  const symbolIsDefault =
    normalizeInlineDiceColorInput(config.symbolColor) ===
    normalizeInlineDiceColorInput(defaultSymbolColor);

  if (config.type === "d6") {
    const value = String(config.faceOrValue as D6Face);
    return symbolToken && !symbolIsDefault
      ? `&d6-${value}-${backgroundToken}-${symbolToken};`
      : `&d6-${value}-${backgroundToken};`;
  }

  const face =
    config.type === "icon"
      ? ICON_FACE_CODE_MAP[config.faceOrValue as IconDiceFace]
      : DETAIL_FACE_CODE_MAP[config.faceOrValue as DetailDiceFace];

  return symbolToken && !symbolIsDefault
    ? `&cd-${face}-${backgroundToken}-${symbolToken};`
    : `&cd-${face}-${backgroundToken};`;
}

export function parseInlineDiceTokenToConfig(
  token: string,
): InlineDiceConfiguratorState | null {
  const trimmed = token.trim().toLowerCase();

  if (trimmed.startsWith("&d6-") && trimmed.endsWith(";")) {
    const [first, second, third] = trimmed.slice(4, -1).split("-");
    const isFirstValue = Number.isInteger(Number(first)) && Number(first) >= 1 && Number(first) <= 6;
    const isSecondValue =
      Number.isInteger(Number(second)) && Number(second) >= 1 && Number(second) <= 6;
    const faceRaw = isFirstValue ? first : isSecondValue ? second : null;
    const colorRaw = isFirstValue ? second : isSecondValue ? first : null;
    if (!faceRaw || !colorRaw) return null;

    const backgroundColor = normalizeInlineDiceColorInput(colorRaw);
    if (!backgroundColor) return null;
    const symbolColor = third
      ? normalizeInlineDiceColorInput(third)
      : getInlineDiceDefaultSymbolColor(backgroundColor);
    if (!symbolColor) return null;

    return {
      type: "d6",
      faceOrValue: Number(faceRaw) as D6Face,
      backgroundColor,
      symbolColor,
    };
  }

  if (trimmed.startsWith("&cd-") && trimmed.endsWith(";")) {
    const [first, second, third] = trimmed.slice(4, -1).split("-");
    const faceCandidate = COMBAT_FACE_SHORT_MAP[first]
      ? first
      : COMBAT_FACE_SHORT_MAP[second]
        ? second
        : null;
    const colorCandidate = faceCandidate === first ? second : faceCandidate === second ? first : null;
    if (!faceCandidate || !colorCandidate) return null;

    const combatFace = COMBAT_FACE_SHORT_MAP[faceCandidate];
    const backgroundColor = normalizeInlineDiceColorInput(colorCandidate);
    if (!combatFace || !backgroundColor) return null;

    const symbolColor = third
      ? normalizeInlineDiceColorInput(third)
      : getInlineDiceDefaultSymbolColor(backgroundColor);
    if (!symbolColor) return null;

    return {
      type:
        combatFace === "skull" || combatFace === "hero" || combatFace === "monster"
          ? "icon"
          : "detail",
      faceOrValue: combatFace,
      backgroundColor,
      symbolColor,
    };
  }

  return null;
}

export function parseDiceToken(raw: string): InlineDiceToken | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":").map((part) => part.trim().toLowerCase());
  if (parts.length < 2) return null;

  const [type, faceRaw, colorRaw] = parts;
  if (type !== "combat" && type !== "d6") return null;

  if (type === "combat") {
    const face = COMBAT_FACE_MAP[faceRaw];
    if (!face) return null;

    const colorKey = colorRaw || "white";
    const color = DICE_COLORS[colorKey] ?? DICE_COLORS.white;
    const faceColor = DICE_FACE_COLORS[colorKey] ?? DICE_FACE_COLORS.white;

    return {
      kind: "dice",
      type: "combat",
      face,
      color,
      faceColor,
      svgUrl: COMBAT_SVG_MAP[face],
    };
  }

  const faceNum = Number(faceRaw);
  if (!Number.isInteger(faceNum) || faceNum < 1 || faceNum > 6) return null;
  const colorKey = colorRaw || "white";
  const color = DICE_COLORS[colorKey] ?? DICE_COLORS.white;
  const faceColor = DICE_FACE_COLORS[colorKey] ?? DICE_FACE_COLORS.white;

  return {
    kind: "dice",
    type: "d6",
    face: faceNum as 1 | 2 | 3 | 4 | 5 | 6,
    color,
    faceColor,
    svgUrl: D6_SVG_MAP[faceNum as D6Face],
  };
}

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function resolveInlineDicePaletteKey(normalizedColor: string): string | null {
  return (
    Object.entries(DICE_COLORS).find(([, value]) => value.toUpperCase() === normalizedColor)?.[0] ??
    null
  );
}

function resolveColorKey(raw?: string): string {
  if (!raw) return "white";
  return COLOR_SHORT_MAP[raw] ?? raw;
}

function resolveColorToken(raw?: string): string | null {
  if (!raw) return DICE_COLORS.white;
  if (HEX_COLOR_PATTERN.test(raw)) {
    const parsed = parseHexColor(raw);
    if (!parsed) return null;
    if (parsed.inputHasAlpha) return formatCssColor(parsed);
    return formatHexColor(parsed, { alphaMode: "strip", case: "lower" });
  }
  const colorKey = resolveColorKey(raw);
  return DICE_COLORS[colorKey] ?? null;
}

function resolveColors(colorRaw?: string, faceColorRaw?: string) {
  const color = resolveColorToken(colorRaw) ?? DICE_COLORS.white;

  if (faceColorRaw) {
    const faceColor = resolveColorToken(faceColorRaw) ?? DICE_COLORS.white;
    return { color, faceColor };
  }

  const normalizedKey = Object.entries(DICE_COLORS).find(([, value]) => value === color)?.[0] ?? "white";
  const faceColor = DICE_FACE_COLORS[normalizedKey] ?? DICE_FACE_COLORS.white;

  return { color, faceColor };
}

function parseShortDiceToken(
  faceRaw: string,
  colorRaw?: string,
  faceColorRaw?: string,
): InlineDiceToken | null {
  const face = COMBAT_FACE_SHORT_MAP[faceRaw];
  if (!face) return null;
  const { color, faceColor } = resolveColors(colorRaw, faceColorRaw);

  return {
    kind: "dice",
    type: "combat",
    face,
    color,
    faceColor,
    svgUrl: COMBAT_SVG_MAP[face],
  };
}

function parseShortD6Token(
  faceRaw: string,
  colorRaw?: string,
  faceColorRaw?: string,
): InlineDiceToken | null {
  const faceNum = Number(faceRaw);
  if (!Number.isInteger(faceNum) || faceNum < 1 || faceNum > 6) return null;
  const { color, faceColor } = resolveColors(colorRaw, faceColorRaw);

  return {
    kind: "dice",
    type: "d6",
    face: faceNum as 1 | 2 | 3 | 4 | 5 | 6,
    color,
    faceColor,
    svgUrl: D6_SVG_MAP[faceNum as D6Face],
  };
}

export function tokenizeInlineDice(line: string): InlineDiceSegment[] {
  const segments: InlineDiceSegment[] = [];
  const pattern = /\[\{[^}]+\}\]|&cd-[^;]+;|&d6-[^;]+;/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // eslint-disable-next-line no-cond-assign
  while ((match = pattern.exec(line)) !== null) {
    const matchStart = match.index;
    const matchEnd = pattern.lastIndex;

    if (matchStart > lastIndex) {
      segments.push({ kind: "text", text: line.slice(lastIndex, matchStart) });
    }

    const rawToken = line.slice(matchStart, matchEnd);
    let token: InlineDiceToken | null = null;

    if (rawToken.startsWith("[{") && rawToken.endsWith("}]")) {
      token = parseDiceToken(rawToken.slice(2, -2));
    } else if (rawToken.startsWith("&cd-") && rawToken.endsWith(";")) {
      const parts = rawToken.slice(4, -1).split("-");
      const [first, second, third] = parts;
      const isFaceFirst = Boolean(COMBAT_FACE_SHORT_MAP[first]);
      const isFaceSecond = Boolean(COMBAT_FACE_SHORT_MAP[second]);
      if (isFaceFirst && !isFaceSecond) {
        token = parseShortDiceToken(first, second, third);
      } else if (!isFaceFirst && isFaceSecond) {
        token = parseShortDiceToken(second, first, third);
      } else if (isFaceFirst && isFaceSecond) {
        token = parseShortDiceToken(first, second, third);
      }
    } else if (rawToken.startsWith("&d6-") && rawToken.endsWith(";")) {
      const parts = rawToken.slice(4, -1).split("-");
      const [first, second, third] = parts;
      const isFaceFirst = Number.isInteger(Number(first)) && Number(first) >= 1 && Number(first) <= 6;
      const isFaceSecond = Number.isInteger(Number(second)) && Number(second) >= 1 && Number(second) <= 6;
      if (isFaceFirst && !isFaceSecond) {
        token = parseShortD6Token(first, second, third);
      } else if (!isFaceFirst && isFaceSecond) {
        token = parseShortD6Token(second, first, third);
      } else if (isFaceFirst && isFaceSecond) {
        token = parseShortD6Token(first, second, third);
      }
    }

    if (token) {
      segments.push({ kind: "dice", token });
    } else {
      segments.push({ kind: "text", text: rawToken });
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < line.length) {
    segments.push({ kind: "text", text: line.slice(lastIndex) });
  }

  return segments;
}
