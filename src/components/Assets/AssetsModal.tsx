"use client";

import ModalShell from "@/components/ModalShell";
import AssetsPanelContent from "@/components/Assets/AssetsPanelContent";
import { useI18n } from "@/i18n/I18nProvider";
import type { AssetRecord } from "@/lib/assets-db";
import styles from "@/app/page.module.css";

type AssetsModalMode = "manage" | "select";

type AssetsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode?: AssetsModalMode;
  onSelect?: (asset: AssetRecord) => void;
};

export default function AssetsModal({
  isOpen,
  onClose,
  mode = "manage",
  onSelect,
}: AssetsModalProps) {
  const { t } = useI18n();
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("heading.assets")}
      contentClassName={styles.assetsPopover}
    >
      <AssetsPanelContent isOpen={isOpen} onClose={onClose} mode={mode} onSelect={onSelect} />
    </ModalShell>
  );
}
