import type { StatAsteriskFlags } from "@/types/stats";

export function normalizeStatAsteriskFlags(
  flags?: StatAsteriskFlags | null,
): StatAsteriskFlags | undefined {
  if (!flags) return undefined;

  const primary = flags[0] === true;
  const secondary = flags[1] === true;

  if (!primary && !secondary) {
    return undefined;
  }

  if (!secondary) {
    return [primary];
  }

  return [primary, true];
}

export function hasStatAsterisk(
  flags: StatAsteriskFlags | undefined,
  index: 0 | 1,
): boolean {
  return flags?.[index] === true;
}

export function setStatAsterisk(
  flags: StatAsteriskFlags | undefined,
  index: 0 | 1,
  enabled: boolean,
): StatAsteriskFlags | undefined {
  const next: StatAsteriskFlags = [
    index === 0 ? enabled : flags?.[0] === true,
    index === 1 ? enabled : flags?.[1] === true,
  ];

  return normalizeStatAsteriskFlags(next);
}
