import type { MouseEvent } from "react";

import type { TemplateId } from "@/types/templates";

export type StockpileCardThumb = {
  id: string;
  thumbnailBlob: Blob | null;
  templateThumbSrc: string | null;
  name?: string;
};

export type StockpileCardView = {
  id: string;
  name: string;
  templateId: TemplateId;
  templateLabel: string;
  effectiveFace: "front" | "back";
  faceLabel: string;
  facePillLabel: string;
  updatedLabel: string;
  timeLabel: string;
  thumbnailBlob: Blob | null;
  templateThumbSrc: string | null;
  paired: {
    back: StockpileCardThumb | null;
    fronts: StockpileCardThumb[];
    frontsVisible: StockpileCardThumb[];
    frontsOverflow: number;
  };
  isSelected: boolean;
  isPairingConflict: boolean;
  conflictPairedName?: string;
  conflictLabel?: string;
};

export type StockpileCardActions = {
  onCardClick: (
    id: string,
    event: MouseEvent<HTMLElement>,
    isPairMode: boolean,
    isPairingConflict: boolean,
  ) => void;
  onCardSetSelected: (
    id: string,
    selected: boolean,
    isPairMode: boolean,
    isPairingConflict: boolean,
  ) => void;
  onCardSelectSingle: (id: string) => void;
  onCardDoubleClick: (id: string) => void;
  onPairHoverEnter: (id: string, rect: DOMRect) => void;
  onPairHoverLeave: (id: string) => void;
  onTableThumbEnter: (id: string, rect: DOMRect) => void;
  onTableThumbLeave: (id: string) => void;
  onConflictHoverEnter: (id: string) => void;
  onConflictHoverLeave: (id: string) => void;
};
