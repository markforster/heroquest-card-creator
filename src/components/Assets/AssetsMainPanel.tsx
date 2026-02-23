"use client";

import AssetsPanelContent from "@/components/Assets/AssetsPanelContent";
import type { AssetKindGroupId } from "@/lib/assets-grouping";
import type { AssetRecord } from "@/lib/assets-db";

type AssetsMainPanelMode = "manage" | "select";

type AssetsMainPanelProps = {
  mode?: AssetsMainPanelMode;
  onSelect?: (asset: AssetRecord) => void;
  onClose?: () => void;
  onSelectionChange?: (assets: AssetRecord[]) => void;
  refreshKey?: number;
  preferredKindOrder?: AssetKindGroupId[];
};

export default function AssetsMainPanel({
  mode = "manage",
  onSelect,
  onClose,
  onSelectionChange,
  refreshKey,
  preferredKindOrder,
}: AssetsMainPanelProps) {
  return (
    <AssetsPanelContent
      isOpen
      onClose={onClose ?? (() => {})}
      mode={mode}
      onSelect={onSelect}
      onSelectionChange={onSelectionChange}
      refreshKey={refreshKey}
      preferredKindOrder={preferredKindOrder}
    />
  );
}
