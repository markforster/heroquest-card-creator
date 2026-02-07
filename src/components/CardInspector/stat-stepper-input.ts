export type StatInputRules = {
  min: number;
  max: number;
  allowWildcard: boolean;
};

const MAX_DIGITS = 3;

export function formatStatInputValue(value: number): string {
  return value === -1 ? "*" : String(value);
}

export function parseStatInputValue(text: string, rules: StatInputRules): number | null {
  if (text === "") return null;
  if (text === "*") {
    return rules.allowWildcard ? -1 : null;
  }
  if (text.includes("*")) return null;
  if (!/^\d+$/.test(text)) return null;
  if (text.length > MAX_DIGITS) return null;
  if (text.length > 1 && text.startsWith("0")) return null;

  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  if (value < rules.min) return null;
  if (value > rules.max) return null;

  return value;
}
