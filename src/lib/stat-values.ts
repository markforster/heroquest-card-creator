import type { StatSplitFormat, StatValue } from "@/types/stats";

function formatSingleStat(value: number): string {
  return value === -1 ? "*" : String(value);
}

export function formatStatValue(value?: StatValue): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const [primary, secondary, splitFlag, splitFormat] = value as [
      number,
      number,
      0 | 1 | undefined,
      StatSplitFormat | undefined,
    ];
    if (splitFlag === 0) {
      return formatSingleStat(primary);
    }
    const format = splitFormat ?? "slash";
    if (format === "paren") {
      return `${formatSingleStat(primary)}(${formatSingleStat(secondary)})`;
    }
    if (format === "paren-leading") {
      return `(${formatSingleStat(primary)})${formatSingleStat(secondary)}`;
    }
    return `${formatSingleStat(primary)}/${formatSingleStat(secondary)}`;
  }
  return formatSingleStat(value);
}
