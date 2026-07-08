import type { TemplateId } from "@/types/templates";

import type { MouseEvent } from "react";


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
};

export type StockpileCardActions = {
  onCardClick: (id: string, event: MouseEvent<HTMLElement>, isPairMode: boolean) => void;
  onCardSetSelected: (id: string, selected: boolean, isPairMode: boolean) => void;
  onCardSelectSingle: (id: string) => void;
  onCardDoubleClick: (id: string) => void;
  onPairHoverEnter: (id: string, rect: DOMRect) => void;
  onPairHoverLeave: (id: string) => void;
  onTableThumbEnter: (id: string, rect: DOMRect) => void;
  onTableThumbLeave: (id: string) => void;
};

export type StockpilePrimaryToolbarFilterOption = {
  value: string;
  label: string;
};

export type StockpilePrimaryToolbarFilterGroup = {
  label: string;
  options: StockpilePrimaryToolbarFilterOption[];
};

export type StockpilePrimaryToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: "grid" | "table";
  onViewModeChange: (next: "grid" | "table") => void;
  filterValue: string;
  onFilterChange: (next: string) => void;
  filterOptions: StockpilePrimaryToolbarFilterGroup[];
  showUnpairedOnly?: boolean;
  onShowUnpairedOnlyChange?: (next: boolean) => void;
  isUnpairedToggleDisabled?: boolean;
  isSearchDisabled?: boolean;
  isFilterDisabled?: boolean;
  isViewModeDisabled?: boolean;
};

export type StockpileBottomToolbarProps = {
  isSelectAllChecked: boolean;
  isSelectAllIndeterminate: boolean;
  isSelectAllDisabled: boolean;
  isSelectNoneDisabled: boolean;
  onSelectAllToggle: () => void;
  onSelectNone: () => void;
  isAddToCollectionDisabled?: boolean;
  isDeleteDisabled?: boolean;
  isExportDisabled?: boolean;
  isLoadDisabled?: boolean;
  onAddToCollection: () => void;
  onDelete: () => void;
  onExport: () => void;
  onLoad: () => void;
};
