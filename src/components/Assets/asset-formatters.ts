import type { CardRecord } from "@/api/cards";

export function formatAssetDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = Math.max(0, bytes);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const precision = value >= 100 || index === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[index]}`;
}

export function sortCardsByUpdated(cards: CardRecord[]): CardRecord[] {
  return cards.sort((a, b) => {
    if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
    const aName = a.nameLower ?? a.name.toLocaleLowerCase();
    const bName = b.nameLower ?? b.name.toLocaleLowerCase();
    return aName.localeCompare(bName);
  });
}
