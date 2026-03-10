"use client";

import { Combine } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import resolveThumb from "@/components/Stockpile/resolveThumb";
import { formatMessage } from "@/components/Stockpile/stockpile-utils";
import StockpilePairOverflowPopover from "@/components/Stockpile/StockpilePairOverflowPopover";
import { USE_EXPORT_PAIR_JITTER } from "@/config/flags";
import { cardTemplatesById } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import {
  } from "@/lib/card-thumbnail-cache";
import type { CardRecord } from "@/api/cards";

type StockpileExportPairPromptProps = {
  exportPairPrompt: {
    baseIds: string[];
    pairedIds: string[];
    exportLabel: string;
    exportOnlyLabel: string;
    previewRows: { left: CardRecord[]; right: CardRecord[] }[];
  } | null;
  onClose: () => void;
  cardById: Map<string, CardRecord>;
  onExportCards: (cards: CardRecord[]) => void;
};

export default function StockpileExportPairPrompt({
  exportPairPrompt,
  onClose,
  cardById,
  onExportCards,
}: StockpileExportPairPromptProps) {
  const { t } = useI18n();
  const formatMessageWith = useMemo(
    () => (key: string, vars: Record<string, string | number>) =>
      formatMessage(t(key as never), vars),
    [t],
  );
  const [pairOverflowAnchor, setPairOverflowAnchor] = useState<{
    rect: { top: number; left: number; bottom: number; right: number };
    cards: CardRecord[];
  } | null>(null);
  const [isPairOverflowOpen, setIsPairOverflowOpen] = useState(false);
  const pairOverflowHoverTimeoutRef = useRef<number | null>(null);
  const exportPairVisibleCount = 9;

  if (!exportPairPrompt) return null;

  const resolveCardJitter = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) {
      hash = (hash * 31 + id.charCodeAt(i)) % 1024;
    }
    const rotation = ((hash % 7) - 3) * 0.6;
    const offsetX = (((hash >> 3) % 7) - 3) * 0.7;
    const offsetY = (((hash >> 6) % 7) - 3) * 0.7;
    return { rotation, offsetX, offsetY };
  };

  const closeOverflow = () => {
    setIsPairOverflowOpen(false);
    setPairOverflowAnchor(null);
  };

  return (
    <>
      <div className={styles.stockpileOverlayBackdrop}>
        <div className={`${styles.stockpileOverlayPanel} ${styles.exportPairPanel}`}>
          <div className={styles.stockpileOverlayHeader}>
            <h3 className={styles.stockpileOverlayTitle}>{t("heading.exportPairedFaces")}</h3>
            <button type="button" className={styles.modalCloseButton} onClick={onClose}>
              <span className="visually-hidden">{t("actions.close")}</span>✕
            </button>
          </div>
          <div className={styles.stockpileOverlayBody}>{t("confirm.exportPairedFacesBody")}</div>
          {exportPairPrompt.previewRows.length > 0 ? (
            <div className={styles.exportPairPreviewList}>
              {exportPairPrompt.previewRows.map((row) => {
                const visibleCount = exportPairVisibleCount;
                return (
                  <div
                    key={`${row.left.map((card) => card.id).join("|")}-${row.right
                      .map((card) => card.id)
                      .join("|")}`}
                    className={styles.exportPairRow}
                  >
                    <div className={`${styles.exportPairStack} ${styles.uRowSm}`}>
                      {row.left.slice(0, visibleCount).map((leftCard, index) => {
                        const leftThumb = resolveThumb(
                          leftCard.id,
                          leftCard.thumbnailBlob ?? null,
                        );
                        const leftTemplateThumb =
                          cardTemplatesById[leftCard.templateId]?.thumbnail ?? null;
                        const leftJitter = USE_EXPORT_PAIR_JITTER
                          ? resolveCardJitter(leftCard.id)
                          : null;
                        return (
                          <div
                            key={leftCard.id}
                            className={`${styles.inspectorStackItem} ${styles.exportPairStackItem}`}
                            style={{ zIndex: index + 1 }}
                          >
                            <div
                              className={styles.inspectorStackThumbInner}
                              style={{
                                transform: leftJitter
                                  ? `translate(${leftJitter.offsetX}px, ${leftJitter.offsetY}px) rotate(${leftJitter.rotation}deg)`
                                  : undefined,
                              }}
                            >
                              {leftThumb.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={leftThumb.url} alt="" onLoad={leftThumb.onLoad} />
                              ) : leftTemplateThumb?.src ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={leftTemplateThumb.src} alt="" />
                              ) : (
                                <div className={styles.inspectorStackPlaceholder} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {row.left.length > visibleCount ? (
                        <div
                          className={`${styles.inspectorStackItem} ${styles.exportPairStackItem} ${styles.inspectorStackOverflowItem}`}
                          style={{ zIndex: Math.min(row.left.length, visibleCount) + 1 }}
                          onMouseEnter={(event) => {
                            if (pairOverflowHoverTimeoutRef.current) {
                              window.clearTimeout(pairOverflowHoverTimeoutRef.current);
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            setPairOverflowAnchor({
                              rect: {
                                top: rect.top,
                                left: rect.left,
                                bottom: rect.bottom,
                                right: rect.right,
                              },
                              cards: row.left,
                            });
                            setIsPairOverflowOpen(true);
                          }}
                          onMouseLeave={() => {
                            if (pairOverflowHoverTimeoutRef.current) {
                              window.clearTimeout(pairOverflowHoverTimeoutRef.current);
                            }
                            pairOverflowHoverTimeoutRef.current = window.setTimeout(() => {
                              closeOverflow();
                            }, 200);
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (pairOverflowHoverTimeoutRef.current) {
                              window.clearTimeout(pairOverflowHoverTimeoutRef.current);
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            setPairOverflowAnchor({
                              rect: {
                                top: rect.top,
                                left: rect.left,
                                bottom: rect.bottom,
                                right: rect.right,
                              },
                              cards: row.left,
                            });
                            setIsPairOverflowOpen(true);
                          }}
                        >
                          <div className={styles.inspectorStackOverflow}>
                            +{row.left.length - visibleCount}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className={styles.exportPairIcon} aria-hidden="true">
                      <Combine size={18} />
                    </div>
                    <div className={`${styles.exportPairStack} ${styles.uRowSm}`}>
                      {row.right.slice(0, visibleCount).map((pairedCard, index) => {
                        const pairedThumb = resolveThumb(
                          pairedCard.id,
                          pairedCard.thumbnailBlob ?? null,
                        );
                        const pairedTemplateThumb =
                          cardTemplatesById[pairedCard.templateId]?.thumbnail ?? null;
                        const pairedJitter = USE_EXPORT_PAIR_JITTER
                          ? resolveCardJitter(pairedCard.id)
                          : null;
                        return (
                          <div
                            key={pairedCard.id}
                            className={`${styles.inspectorStackItem} ${styles.exportPairStackItem}`}
                            style={{ zIndex: index + 1 }}
                          >
                            <div
                              className={styles.inspectorStackThumbInner}
                              style={{
                                transform: pairedJitter
                                  ? `translate(${pairedJitter.offsetX}px, ${pairedJitter.offsetY}px) rotate(${pairedJitter.rotation}deg)`
                                  : undefined,
                              }}
                            >
                              {pairedThumb.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={pairedThumb.url} alt="" onLoad={pairedThumb.onLoad} />
                              ) : pairedTemplateThumb?.src ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={pairedTemplateThumb.src} alt="" />
                              ) : (
                                <div className={styles.inspectorStackPlaceholder} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {row.right.length > visibleCount ? (
                        <div
                          className={`${styles.inspectorStackItem} ${styles.exportPairStackItem} ${styles.inspectorStackOverflowItem}`}
                          style={{ zIndex: Math.min(row.right.length, visibleCount) + 1 }}
                          onMouseEnter={(event) => {
                            if (pairOverflowHoverTimeoutRef.current) {
                              window.clearTimeout(pairOverflowHoverTimeoutRef.current);
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            setPairOverflowAnchor({
                              rect: {
                                top: rect.top,
                                left: rect.left,
                                bottom: rect.bottom,
                                right: rect.right,
                              },
                              cards: row.right,
                            });
                            setIsPairOverflowOpen(true);
                          }}
                          onMouseLeave={() => {
                            if (pairOverflowHoverTimeoutRef.current) {
                              window.clearTimeout(pairOverflowHoverTimeoutRef.current);
                            }
                            pairOverflowHoverTimeoutRef.current = window.setTimeout(() => {
                              closeOverflow();
                            }, 200);
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (pairOverflowHoverTimeoutRef.current) {
                              window.clearTimeout(pairOverflowHoverTimeoutRef.current);
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            setPairOverflowAnchor({
                              rect: {
                                top: rect.top,
                                left: rect.left,
                                bottom: rect.bottom,
                                right: rect.right,
                              },
                              cards: row.right,
                            });
                            setIsPairOverflowOpen(true);
                          }}
                        >
                          <div className={styles.inspectorStackOverflow}>
                            +{row.right.length - visibleCount}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className={styles.exportPairActions}>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              {t("actions.cancel")}
            </button>
            <div className={styles.exportPairActionGroup}>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  const baseCards = exportPairPrompt.baseIds
                    .map((id) => cardById.get(id))
                    .filter((card): card is CardRecord => Boolean(card));
                  onClose();
                  onExportCards(baseCards);
                }}
              >
                {exportPairPrompt.exportOnlyLabel}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const combinedIds = [...exportPairPrompt.baseIds, ...exportPairPrompt.pairedIds];
                  const exportCards = combinedIds
                    .map((id) => cardById.get(id))
                    .filter((card): card is CardRecord => Boolean(card));
                  onClose();
                  onExportCards(exportCards);
                }}
              >
                {exportPairPrompt.exportLabel} +{" "}
                {formatMessageWith("label.pairedCardsCount", {
                  count: exportPairPrompt.pairedIds.length,
                })}
              </button>
            </div>
          </div>
        </div>
      </div>
      <StockpilePairOverflowPopover
        isOpen={isPairOverflowOpen}
        anchor={pairOverflowAnchor}
        onClose={closeOverflow}
        onMouseEnter={() => {
          if (pairOverflowHoverTimeoutRef.current) {
            window.clearTimeout(pairOverflowHoverTimeoutRef.current);
          }
          setIsPairOverflowOpen(true);
        }}
        onMouseLeave={() => {
          if (pairOverflowHoverTimeoutRef.current) {
            window.clearTimeout(pairOverflowHoverTimeoutRef.current);
          }
          pairOverflowHoverTimeoutRef.current = window.setTimeout(() => {
            closeOverflow();
          }, 200);
        }}
      />
    </>
  );
}
