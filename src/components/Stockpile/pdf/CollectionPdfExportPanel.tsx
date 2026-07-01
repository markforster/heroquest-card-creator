"use client";

import { useI18n } from "@/i18n/I18nProvider";

type CollectionPdfExportPanelProps = {
  collectionName: string | null;
  count: number;
};

export default function CollectionPdfExportPanel({
  collectionName,
  count,
}: CollectionPdfExportPanelProps) {
  const { t } = useI18n();

  return (
    <div className="d-flex flex-column gap-1">
      <div className="fw-semibold">
        {collectionName?.trim() || t("heading.collections")}
      </div>
      <div>{`${t("label.cards")}: ${count}`}</div>
    </div>
  );
}
