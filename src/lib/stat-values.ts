import { hasStatAsterisk } from "@/lib/stat-asterisks";
import type { StatAsteriskFlags, StatSplitFormat, StatValue } from "@/types/stats";

function formatSingleStat(value: number, hasAsterisk: boolean): string {
  if (value === -1) return "*";
  return hasAsterisk ? `${String(value)}*` : String(value);
}

export function formatStatValue(
  value?: StatValue,
  asterisks?: StatAsteriskFlags,
): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const [primary, secondary, splitFlag, splitFormat] = value as [
      number,
      number,
      0 | 1 | undefined,
      StatSplitFormat | undefined,
    ];
    if (splitFlag === 0) {
      return formatSingleStat(primary, hasStatAsterisk(asterisks, 0));
    }
    const format = splitFormat ?? "slash";
    if (format === "paren") {
      return `${formatSingleStat(primary, hasStatAsterisk(asterisks, 0))}(${formatSingleStat(
        secondary,
        hasStatAsterisk(asterisks, 1),
      )})`;
    }
    if (format === "paren-leading") {
      return `(${formatSingleStat(primary, hasStatAsterisk(asterisks, 0))})${formatSingleStat(
        secondary,
        hasStatAsterisk(asterisks, 1),
      )}`;
    }
    return `${formatSingleStat(primary, hasStatAsterisk(asterisks, 0))}/${formatSingleStat(
      secondary,
      hasStatAsterisk(asterisks, 1),
    )}`;
  }
  return formatSingleStat(value, hasStatAsterisk(asterisks, 0));
}
