"use client";

import styles from "@/app/page.module.css";
import AssetInspectorPreview from "@/components/Assets/AssetInspectorPreview";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";
import { getDisplayAssetName } from "@/lib/asset-filename";

type AssetsPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
  isLoading: boolean;
  assetName: string;
};

export default function AssetsPreviewModal({
  isOpen,
  onClose,
  previewUrl,
  isLoading,
  assetName,
}: AssetsPreviewModalProps) {
  const { t } = useI18n();

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`${t("label.preview")}: ${getDisplayAssetName(assetName)}`}
      contentClassName={styles.assetsPreviewModalPopover}
    >
      <div className={styles.assetsPreviewModalBody}>
        <AssetInspectorPreview
          previewUrl={previewUrl}
          isLoading={isLoading}
          alt={assetName}
          emptyContent={t("empty.noPreview")}
          variant="modal"
          containerClassName={styles.assetsPreviewModalFrame}
        />
      </div>
    </ModalShell>
  );
}
