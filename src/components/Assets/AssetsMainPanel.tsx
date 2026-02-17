"use client";

import AssetsPanelContent from "@/components/Assets/AssetsPanelContent";
import type { AssetRecord } from "@/lib/assets-db";

type AssetsMainPanelMode = "manage" | "select";

type AssetsMainPanelProps = {
  mode?: AssetsMainPanelMode;
  onSelect?: (asset: AssetRecord) => void;
  onClose?: () => void;
};

export default function AssetsMainPanel({
  mode = "manage",
  onSelect,
  onClose,
}: AssetsMainPanelProps) {
  return (
    <AssetsPanelContent
      isOpen
      onClose={onClose ?? (() => {})}
      mode={mode}
      onSelect={onSelect}
    />
  );
}
