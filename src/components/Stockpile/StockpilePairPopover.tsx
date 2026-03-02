"use client";

import { createPortal } from "react-dom";

import styles from "@/app/page.module.css";
import { cardTemplatesById } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import { resolveEffectiveFace } from "@/lib/card-face";
import {
  getCachedCardThumbnailUrl,
  getLegacyCardThumbnailUrl,
  releaseLegacyCardThumbnailUrl,
} from "@/lib/card-thumbnail-cache";
import type { CardRecord } from "@/types/cards-db";

type StockpilePairPopoverProps = {
  hoveredPairCardId: string | null;
  pairPopoverAnchor: {
    id: string;
    rect: { top: number; left: number; bottom: number; right: number };
  } | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  cardById: Map<string, CardRecord>;
  pairedByTargetId: Map<string, CardRecord[]>;
  backByFrontId: Map<string, string>;
};

export default function StockpilePairPopover({
  hoveredPairCardId,
  pairPopoverAnchor,
  onMouseEnter,
  onMouseLeave,
  cardById,
  pairedByTargetId,
  backByFrontId,
}: StockpilePairPopoverProps) {
  const { t } = useI18n();
  if (!hoveredPairCardId || !pairPopoverAnchor || typeof document === "undefined") {
    return null;
  }
  const hoveredCard = cardById.get(hoveredPairCardId) ?? null;
  if (!hoveredCard) return null;
  const hoveredTemplate = cardTemplatesById[hoveredCard.templateId];
  const hoveredFace = resolveEffectiveFace(
    hoveredCard.face,
    hoveredTemplate?.defaultFace ?? "front",
  );
  const isHoveredBack = hoveredFace === "back";
  const hoveredPairedFronts = pairedByTargetId.get(hoveredCard.id) ?? [];
  const hoveredPairedCard = backByFrontId.get(hoveredCard.id)
    ? (cardById.get(backByFrontId.get(hoveredCard.id) ?? "") ?? null)
    : (hoveredPairedFronts[0] ?? null);
  const hoveredPairedThumb =
    typeof window !== "undefined" && hoveredPairedCard
      ? ENABLE_CARD_THUMB_CACHE
        ? {
            url: getCachedCardThumbnailUrl(
              hoveredPairedCard.id,
              hoveredPairedCard.thumbnailBlob ?? null,
            ),
            onLoad: undefined,
          }
        : (() => {
            const url = getLegacyCardThumbnailUrl(
              hoveredPairedCard.id,
              hoveredPairedCard.thumbnailBlob ?? null,
            );
            return { url, onLoad: url ? () => releaseLegacyCardThumbnailUrl(url) : undefined };
          })()
      : { url: null as string | null, onLoad: undefined as (() => void) | undefined };
  const hoveredPairedTemplateThumb = hoveredPairedCard
    ? cardTemplatesById[hoveredPairedCard.templateId]?.thumbnail
    : null;
  const popoverColumns = 6;
  const tileWidth = 72;
  const tileHeight = 100;
  const tileGap = 6;
  const popoverPadding = 12;
  const isGridPopover = isHoveredBack && hoveredPairedFronts.length > 1;
  const popoverWidth = isGridPopover
    ? popoverPadding * 2 + popoverColumns * tileWidth + (popoverColumns - 1) * tileGap
    : popoverPadding * 2 + tileWidth;
  const popoverMaxHeight = isGridPopover ? 320 : popoverPadding * 2 + tileHeight;
  const left = Math.min(pairPopoverAnchor.rect.left, window.innerWidth - popoverWidth - 16);
  const top = Math.min(
    pairPopoverAnchor.rect.bottom + 6,
    window.innerHeight - popoverMaxHeight - 16,
  );

  return createPortal(
    <div
      className={
        isGridPopover ? styles.cardsPairStackPopoverGrid : styles.cardsPairStackPopoverSingle
      }
      aria-hidden="true"
      style={{ left, top }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isHoveredBack ? (
        hoveredPairedFronts.length ? (
          <div className={isGridPopover ? styles.cardsPairStackGrid : styles.cardsPairStackGridSingle}>
            {hoveredPairedFronts
              .slice(0, isGridPopover ? hoveredPairedFronts.length : 1)
              .map((paired) => {
                const gridThumb =
                  typeof window !== "undefined"
                    ? ENABLE_CARD_THUMB_CACHE
                      ? {
                          url: getCachedCardThumbnailUrl(
                            paired.id,
                            paired.thumbnailBlob ?? null,
                          ),
                          onLoad: undefined,
                        }
                      : (() => {
                          const url = getLegacyCardThumbnailUrl(
                            paired.id,
                            paired.thumbnailBlob ?? null,
                          );
                          return {
                            url,
                            onLoad: url
                              ? () => releaseLegacyCardThumbnailUrl(url)
                              : undefined,
                          };
                        })()
                    : { url: null as string | null, onLoad: undefined as (() => void) | undefined };
                const gridTemplateThumb = cardTemplatesById[paired.templateId]?.thumbnail;
                return (
                  <div key={paired.id} className={styles.cardsPairStackGridItem}>
                    {gridThumb.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={gridThumb.url} alt="" onLoad={gridThumb.onLoad} />
                    ) : gridTemplateThumb?.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={gridTemplateThumb.src} alt="" />
                    ) : (
                      <div className={styles.cardsPairIndicatorPlaceholder} />
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <div className={styles.cardsPairStackGridSingle}>
            <div
              className={`${styles.cardsPairStackGridItem} ${styles.cardsPairStackGridItemEmpty}`}
            >
              <div className={styles.cardsPairIndicatorEmpty}>{t("warning.notPaired")}</div>
            </div>
          </div>
        )
      ) : (
        <div className={styles.cardsPairStackGridSingle}>
          <div
            className={`${styles.cardsPairStackGridItem} ${
              hoveredPairedCard ? "" : styles.cardsPairStackGridItemEmpty
            }`}
          >
            {hoveredPairedCard ? (
              hoveredPairedThumb.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hoveredPairedThumb.url} alt="" onLoad={hoveredPairedThumb.onLoad} />
              ) : hoveredPairedTemplateThumb?.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hoveredPairedTemplateThumb.src} alt="" />
              ) : (
                <div className={styles.cardsPairIndicatorPlaceholder} />
              )
            ) : (
              <div className={styles.cardsPairIndicatorEmpty}>{t("warning.notPaired")}</div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
