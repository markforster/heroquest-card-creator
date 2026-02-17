"use client";

import AssetsPanelContent from "@/components/Assets/AssetsPanelContent";
import type { AssetRecord } from "@/lib/assets-db";

type AssetsMainPanelMode = "manage" | "select";

type AssetsMainPanelProps = {
  mode?: AssetsMainPanelMode;
  onSelect?: (asset: AssetRecord) => void;
  onClose?: () => void;
  onSelectionChange?: (assets: AssetRecord[]) => void;
  refreshKey?: number;
};

export default function AssetsMainPanel({
  mode = "manage",
  onSelect,
  onClose,
  onSelectionChange,
  refreshKey,
}: AssetsMainPanelProps) {
  return (
    <AssetsPanelContent
      isOpen
      onClose={onClose ?? (() => {})}
      mode={mode}
      onSelect={onSelect}
      onSelectionChange={onSelectionChange}
      refreshKey={refreshKey}
    />
  );
}
