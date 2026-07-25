"use client";

import type { AssetRecord } from "@/api/assets";
import AssetsPanelContent from "@/components/Assets/AssetsPanelContent";
import type { AssetKindGroupId } from "@/lib/assets-grouping";

type AssetsMainPanelMode = "manage" | "select";

type AssetsMainPanelProps = {
  mode?: AssetsMainPanelMode;
  onSelect?: (asset: AssetRecord) => void;
  onClose?: () => void;
  onSelectionChange?: (assets: AssetRecord[]) => void;
  refreshKey?: number;
  preferredKindOrder?: AssetKindGroupId[];
  onPrimarySearchReady?: (focusSearch: (() => boolean) | null) => void;
};

export default function AssetsMainPanel({
  mode = "manage",
  onSelect,
  onClose,
  onSelectionChange,
  refreshKey,
  preferredKindOrder,
  onPrimarySearchReady,
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
      onPrimarySearchReady={onPrimarySearchReady}
    />
  );
}
