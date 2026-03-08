"use client";

import StockpilePanelContent from "@/components/Stockpile/StockpilePanelContent";
import type { CardRecord } from "@/types/cards-db";
import type { OpenCloseProps } from "@/types/ui";

export type StockpileModalMode = "manage" | "pair-fronts" | "pair-backs";

type StockpileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoadCard?: (card: CardRecord) => void;
  refreshToken?: number;
  activeCardId?: string | null;
  mode?: StockpileModalMode;
  onConfirmSelection?: (cardIds: string[]) => void;
  initialSelectedIds?: string[];
  titleOverride?: string;
};

export default function StockpileModal({
  isOpen,
  onClose,
  onLoadCard,
  refreshToken,
  activeCardId,
  mode = "manage",
  onConfirmSelection,
  initialSelectedIds,
  titleOverride,
}: StockpileModalProps) {
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
      frame="modal"
    />
  );
}
