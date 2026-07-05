"use client";

import { useCallback, useMemo } from "react";

import CollectionPdfExportPanel from "@/components/Stockpile/pdf/CollectionPdfExportPanel";
import { buildCollectionPdfFileName } from "@/components/Stockpile/pdf/collectionPdfFileName";
import { buildCollectionPdfSummaryContent } from "@/components/Stockpile/pdf/buildCollectionPdfSummaryContent";
import PdfExportShellModal, {
  type PdfExportRun,
  type PdfExportShellPolicy,
} from "@/components/Export/PdfExportShellModal";
import { useI18n } from "@/i18n/I18nProvider";
import type { SlotPair } from "@/lib/pdf-export";

type CollectionPdfExportSummaryModalProps = {
  isOpen: boolean;
  collectionName: string | null;
  faceIds: string[];
  onClose: () => void;
};

const COLLECTION_PDF_SHELL_POLICY: PdfExportShellPolicy = {
  mode: { hidden: true, forcedValue: "frontsOnly" },
  duplexPreset: { hidden: true, forcedValue: "normal" },
  alignmentExportHidden: true,
};

export default function CollectionPdfExportSummaryModal({
  isOpen,
  collectionName,
  faceIds,
  onClose,
}: CollectionPdfExportSummaryModalProps) {
  const { t } = useI18n();

  const slotPairs = useMemo<SlotPair[]>(
    () =>
      faceIds.map((faceId, index) => ({
        slotId: `collection-slot-${index + 1}`,
        frontId: faceId,
        backId: null,
      })),
    [faceIds],
  );

  const summaryContent = useMemo(
    () => buildCollectionPdfSummaryContent(slotPairs.length, t),
    [slotPairs.length, t],
  );

  const buildExportRun = useCallback(async (): Promise<PdfExportRun> => {
    const resolvedCollectionName = collectionName?.trim() || t("heading.collections");
    return {
      fileName: buildCollectionPdfFileName({
        collectionName: resolvedCollectionName,
        date: new Date(),
      }),
    };
  }, [collectionName, t]);

  return (
    <PdfExportShellModal
      isOpen={isOpen}
      title={`${t("actions.export")} PDF`}
      sourceType="collection"
      slotPairs={slotPairs}
      shellPolicy={COLLECTION_PDF_SHELL_POLICY}
      summaryContent={summaryContent}
      onCancel={onClose}
      buildExportRun={buildExportRun}
      topContent={
        <CollectionPdfExportPanel collectionName={collectionName} count={slotPairs.length} />
      }
    />
  );
}
