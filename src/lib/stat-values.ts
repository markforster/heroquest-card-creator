import type { StatValue } from "@/types/stats";

function formatSingleStat(value: number): string {
  return value === -1 ? "*" : String(value);
}

export function formatStatValue(value?: StatValue): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const [primary, secondary, splitFlag] = value;
    if (splitFlag === 0) {
      return formatSingleStat(primary);
    }
    return `${formatSingleStat(primary)}/${formatSingleStat(secondary)}`;
  }
  return formatSingleStat(value);
}
