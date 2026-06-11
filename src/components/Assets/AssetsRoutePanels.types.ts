import type { CardRecord } from "@/api/cards";

export type AssetUsage = {
  total: number;
  cards: CardRecord[];
};

export type AssetUsageBounds = {
  width: number;
  height: number;
};

export type UsagePopoverAnchor = {
  rect: { top: number; left: number; bottom: number; right: number };
};
