"use client";

import ModalShell from "@/components/common/ModalShell";
import AssetsPanelContent from "@/components/Assets/AssetsPanelContent";
import { useI18n } from "@/i18n/I18nProvider";
import type { AssetKindGroupId } from "@/lib/assets-grouping";
import type { AssetRecord } from "@/lib/assets-db";
import styles from "@/app/page.module.css";
import type { OpenCloseProps } from "@/types/ui";

type AssetsModalMode = "manage" | "select";

type AssetsModalProps = OpenCloseProps & {
  mode?: AssetsModalMode;
  onSelect?: (asset: AssetRecord) => void;
  preferredKindOrder?: AssetKindGroupId[];
};

export default function AssetsModal({
  isOpen,
  onClose,
  mode = "manage",
  onSelect,
  preferredKindOrder,
}: AssetsModalProps) {
  const { t } = useI18n();
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("heading.assets")}
      contentClassName={styles.assetsPopover}
    >
      <AssetsPanelContent
        isOpen={isOpen}
        onClose={onClose}
        mode={mode}
        onSelect={onSelect}
        preferredKindOrder={preferredKindOrder}
      />
    </ModalShell>
  );
}
