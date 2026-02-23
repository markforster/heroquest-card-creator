"use client";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { cardTemplatesById } from "@/data/card-templates";
import type { MissingAssetReport } from "@/lib/export-assets-cache";
import { useI18n } from "@/i18n/I18nProvider";

type StockpileMissingAssetsModalProps = {
  prompt: {
    cards: Array<{ id: string }>;
    report: MissingAssetReport[];
    skipIds: Set<string>;
    skipNotes: Map<string, string>;
  } | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function StockpileMissingAssetsModal({
  prompt,
  onConfirm,
  onCancel,
}: StockpileMissingAssetsModalProps) {
  const { t } = useI18n();
  const openCardInNewTab = (cardId: string) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}#/cards/${cardId}`;
    window.open(url, "_blank", "noopener");
  };
  if (!prompt) return null;
  return (
    <ConfirmModal
      isOpen={Boolean(prompt)}
      title={t("warning.missingAssetsTitle")}
      confirmLabel={t("actions.proceedExport")}
      cancelLabel={t("actions.cancel")}
      contentClassName={styles.missingAssetsModal}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div>{t("warning.missingAssetsBody")}</div>
      <div className={styles.assetsReportStatus}>{t("label.opensInNewTab")}</div>
      <div className={styles.assetsReportList}>
        {prompt.report.map((entry) => {
          const thumbUrl = entry.thumbnailBlob ? URL.createObjectURL(entry.thumbnailBlob) : null;
          const fallbackUrl = cardTemplatesById[entry.templateId]?.thumbnail?.src ?? null;
          return (
            <div key={entry.cardId} className={styles.assetsReportItem}>
              <div className="d-flex align-items-center gap-3">
                <CardThumbnail
                  src={thumbUrl ?? fallbackUrl}
                  alt={entry.title}
                  variant="sm"
                  onLoad={() => {
                    if (thumbUrl) {
                      URL.revokeObjectURL(thumbUrl);
                    }
                  }}
                />
                <div className={styles.assetsReportName}>
                  {entry.title} ({entry.templateId})
                </div>
              </div>
              <div className={styles.assetsReportStatus}>
                {t("label.missingAssets")}:{" "}
                {entry.missing.map((asset) => `${asset.label} \"${asset.name}\"`).join(", ")}
              </div>
              <button
                type="button"
                className="btn btn-outline-light btn-sm mt-2"
                onClick={() => openCardInNewTab(entry.cardId)}
              >
                {t("actions.openCardNewTab")}
              </button>
            </div>
          );
        })}
      </div>
    </ConfirmModal>
  );
}
