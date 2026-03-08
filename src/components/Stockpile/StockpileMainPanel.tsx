"use client";

import StockpilePanelContent from "@/components/Stockpile/StockpilePanelContent";
import type { CardRecord } from "@/types/cards-db";

type StockpileMainPanelProps = {
  isOpen?: boolean;
  onClose?: () => void;
  onLoadCard?: (card: CardRecord) => void;
  refreshToken?: number;
  activeCardId?: string | null;
  mode?: "manage" | "pair-fronts" | "pair-backs";
  onConfirmSelection?: (cardIds: string[]) => void;
  initialSelectedIds?: string[];
  titleOverride?: string;
};

export default function StockpileMainPanel({
  isOpen = true,
  onClose = () => {},
  onLoadCard,
  refreshToken,
  activeCardId,
  mode = "manage",
  onConfirmSelection,
  initialSelectedIds,
  titleOverride,
}: StockpileMainPanelProps) {
  return (
    <StockpilePanelContent
      isOpen={isOpen}
      onClose={onClose}
      onLoadCard={onLoadCard}
      refreshToken={refreshToken}
      activeCardId={activeCardId}
      mode={mode}
      onConfirmSelection={onConfirmSelection}
      initialSelectedIds={initialSelectedIds}
      titleOverride={titleOverride}
      frame="panel"
    />
  );
}
