"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo } from "react";

import { useGetCard } from "@/api/hooks";
import styles from "@/app/page.module.css";
import CardPreview from "@/components/Cards/CardPreview";
import { useDeckDetailSelection } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import { useDeckRightPanel } from "@/components/Decks/detail/context/DeckRightPanelContext";
import { useDeckSetEntries } from "@/components/Decks/detail/context/DeckSetEntriesContext";
import { cardTemplatesById } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import { cardRecordToCardData } from "@/lib/card-record-mapper";

import type { TemplateId } from "@/types/templates";

function resolveTemplateLabel(templateId?: string | null): string | null {
  if (!templateId) return null;
  return cardTemplatesById[templateId as keyof typeof cardTemplatesById]?.name ?? templateId;
}

export default function DeckPreviewPanel() {
  const { t } = useI18n();
  const selection = useDeckDetailSelection();
  const entries = useDeckSetEntries();
  const rightPanel = useDeckRightPanel();

  const orderedSelectedEntryIds = useMemo(
    () => entries.entriesSorted.map((entry) => entry.id).filter((entryId) => rightPanel.selectedEntryIds.has(entryId)),
    [entries.entriesSorted, rightPanel.selectedEntryIds],
  );
  const activeSelectedEntryId = useMemo(() => {
    if (orderedSelectedEntryIds.length === 0) return null;
    if (
      rightPanel.activePreviewEntryId &&
      orderedSelectedEntryIds.includes(rightPanel.activePreviewEntryId)
    ) {
      return rightPanel.activePreviewEntryId;
    }
    return orderedSelectedEntryIds[0] ?? null;
  }, [orderedSelectedEntryIds, rightPanel.activePreviewEntryId]);
  const activeSelectedEntryIndex = activeSelectedEntryId
    ? orderedSelectedEntryIds.indexOf(activeSelectedEntryId)
    : -1;
  const selectedFrontCardId = activeSelectedEntryId
    ? entries.entryFrontIdByEntryId.get(activeSelectedEntryId) ?? null
    : null;
  const selectedSet = selection.selectedSetId
    ? selection.setById.get(selection.selectedSetId) ?? null
    : null;
  const fallbackCardId = selectedSet?.backFaceId ?? null;
  const preferSetPreview = rightPanel.previewSelectionSource === "set";
  const previewCardId = preferSetPreview
    ? (fallbackCardId ?? selectedFrontCardId)
    : (selectedFrontCardId ?? fallbackCardId);
  const previewFaceLabel =
    previewCardId === selectedFrontCardId && selectedFrontCardId
      ? t("decks.faces.front")
      : t("decks.faces.back");
  const carouselVisible = orderedSelectedEntryIds.length > 1;
  const previewSummary = useMemo(
    () => rightPanel.backCards.find((card) => card.id === previewCardId) ?? null,
    [previewCardId, rightPanel.backCards],
  );
  const previewCardQuery = useGetCard(
    { params: { id: previewCardId ?? "" } },
    { enabled: Boolean(previewCardId) },
  );
  const previewRecord = previewCardId ? (previewCardQuery.data ?? null) : null;
  const previewTitle =
    previewRecord?.name?.trim() || previewRecord?.title?.trim() || previewSummary?.name?.trim() || null;
  const previewTemplateLabel = resolveTemplateLabel(previewRecord?.templateId);
  const previewTemplate =
    previewRecord?.templateId != null
      ? cardTemplatesById[previewRecord.templateId as TemplateId] ?? null
      : null;
  const previewCardData =
    previewRecord?.templateId != null
      ? cardRecordToCardData(previewRecord as typeof previewRecord & { templateId: TemplateId })
      : null;

  useEffect(() => {
    if (activeSelectedEntryId === rightPanel.activePreviewEntryId) return;
    rightPanel.setActivePreviewEntryId(activeSelectedEntryId);
  }, [
    activeSelectedEntryId,
    rightPanel.activePreviewEntryId,
    rightPanel.setActivePreviewEntryId,
  ]);

  const movePreview = (delta: number) => {
    if (orderedSelectedEntryIds.length <= 1 || activeSelectedEntryIndex < 0) return;
    const nextIndex =
      (activeSelectedEntryIndex + delta + orderedSelectedEntryIds.length) %
      orderedSelectedEntryIds.length;
    rightPanel.setActivePreviewEntryId(orderedSelectedEntryIds[nextIndex] ?? null);
  };

  return (
    <div className={styles.deckPreviewPanel}>
      <div className={styles.deckFaceModeHeader}>
        <div className={styles.deckFaceModeTitle}>{t("label.preview")}</div>
      </div>
      {previewCardId ? (
        <div className={styles.deckPreviewPanelBody}>
          {carouselVisible ? (
            <div className={`${styles.assetsInspectorCarousel} ${styles.uRowLg}`}>
              <button
                type="button"
                className={styles.assetsInspectorCarouselButton}
                onClick={() => movePreview(-1)}
                aria-label={t("actions.previous")}
              >
                <ChevronLeft />
              </button>
              <div className={styles.assetsInspectorCarouselMeta}>
                <div className={styles.assetsInspectorCarouselCount}>
                  {orderedSelectedEntryIds.length} {t("label.cards")}
                </div>
                <div className={styles.assetsInspectorCarouselIndex}>
                  {activeSelectedEntryIndex + 1} / {orderedSelectedEntryIds.length}
                </div>
              </div>
              <button
                type="button"
                className={styles.assetsInspectorCarouselButton}
                onClick={() => movePreview(1)}
                aria-label={t("actions.next")}
              >
                <ChevronRight />
              </button>
            </div>
          ) : null}
          <div className={styles.deckPreviewCard}>
            {previewRecord && previewTemplate && previewCardData ? (
              <div className={styles.deckPreviewRenderFrame}>
                <CardPreview
                  templateId={previewRecord.templateId as TemplateId}
                  templateName={previewTemplate.name}
                  backgroundSrc={previewTemplate.background}
                  cardData={previewCardData}
                  copyrightTextColor={previewRecord.copyrightColor}
                  suppressPreviewOnlyWarnings
                />
              </div>
            ) : (
              <div className={styles.deckPreviewCardFallback} />
            )}
          </div>
          <div className={styles.deckPreviewLabel}>{previewFaceLabel}</div>
          {previewTitle ? (
            <div className={styles.deckPreviewTitle} title={previewTitle}>
              {previewTitle}
            </div>
          ) : null}
          {previewTemplateLabel ? (
            <div className={styles.deckPreviewMeta} title={previewTemplateLabel}>
              {previewTemplateLabel}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.deckPreviewEmpty}>
          <div className={styles.inspectorModeEmpty}>{t("decks.entries.empty.selectSet")}</div>
        </div>
      )}
    </div>
  );
}
