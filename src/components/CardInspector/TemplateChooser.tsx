"use client";

import { BringToFront, Combine, SendToBack, Unlink2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "@/app/page.module.css";
import { useAppActions } from "@/components/AppActionsContext";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import ConfirmModal from "@/components/ConfirmModal";
import { useEditorSave } from "@/components/EditorSaveContext";
import { usePreviewRenderer } from "@/components/PreviewRendererContext";
import { ENABLE_WEBGL_RECENTER_ON_FACE_SELECT } from "@/config/flags";
import { cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { getCard, listCards, touchCardLastViewed, updateCard, updateCards } from "@/lib/cards-db";
import type { CardDataByTemplate } from "@/types/card-data";
import type { CardFace } from "@/types/card-face";
import type { CardRecord } from "@/types/cards-db";
import type { TemplateId } from "@/types/templates";

type PendingFaceChange =
  | {
      mode: "front-to-back";
      nextFace: CardFace;
      pairedTitle: string;
    }
  | {
      mode: "back-to-front";
      nextFace: CardFace;
      affectedFrontIds: string[];
      affectedCount: number;
    };

const FALLBACK_TITLE = "Untitled card";

export default function TemplateChooser() {
  const { t, language } = useI18n();
  const { requestRecenter } = usePreviewRenderer();
  const recenterTimeoutRef = useRef<number | null>(null);
  const {
    state: { selectedTemplateId, cardDrafts, activeCardIdByTemplate, isDirtyByTemplate },
    setSelectedTemplateId,
    setCardDraft,
    setTemplateDirty,
    loadCardIntoEditor,
  } = useCardEditor();
  const { openStockpile } = useAppActions();
  const { saveCurrentCard, saveToken } = useEditorSave();
  const [pendingChange, setPendingChange] = useState<PendingFaceChange | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isFaceMenuOpen, setIsFaceMenuOpen] = useState(false);
  const [pairedCard, setPairedCard] = useState<CardRecord | null>(null);
  const [pairedThumbnailUrl, setPairedThumbnailUrl] = useState<string | null>(null);
  const [currentCard, setCurrentCard] = useState<CardRecord | null>(null);
  const [currentThumbnailUrl, setCurrentThumbnailUrl] = useState<string | null>(null);
  const [pairedFronts, setPairedFronts] = useState<CardRecord[]>([]);
  const [pairedFrontsToken, setPairedFrontsToken] = useState(0);
  const [pendingOpenCard, setPendingOpenCard] = useState<CardRecord | null>(null);
  const [pendingFaceChange, setPendingFaceChange] = useState<CardFace | null>(null);
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
  const [overflowPopoverAnchor, setOverflowPopoverAnchor] = useState<{
    rect: { top: number; left: number; bottom: number; right: number };
  } | null>(null);
  const [isOverflowPopoverOpen, setIsOverflowPopoverOpen] = useState(false);
  const overflowHoverTimeoutRef = useRef<number | null>(null);
  const faceMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!faceMenuRef.current) return;
      if (!faceMenuRef.current.contains(event.target as Node)) {
        setIsFaceMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentTemplateId = selectedTemplateId ?? null;
  const template = currentTemplateId ? cardTemplatesById[currentTemplateId] : undefined;
  const draft = currentTemplateId
    ? (cardDrafts[currentTemplateId] as CardDataByTemplate[TemplateId] | undefined)
    : undefined;
  const activeCardId = currentTemplateId ? activeCardIdByTemplate[currentTemplateId] : undefined;

  const effectiveFace = useMemo<CardFace | undefined>(() => {
    if (!template) return undefined;
    return (draft?.face ?? template.defaultFace) as CardFace;
  }, [draft?.face, template]);
  const isInferredFace = Boolean(template && draft?.face == null);

  const openCard = async (cardId: string) => {
    try {
      const record = await getCard(cardId);
      if (!record) return;
      const viewed = await touchCardLastViewed(record.id);
      const nextRecord = viewed ?? record;
      setSelectedTemplateId(nextRecord.templateId as TemplateId);
      loadCardIntoEditor(nextRecord.templateId as TemplateId, nextRecord);
      if (ENABLE_WEBGL_RECENTER_ON_FACE_SELECT) {
        if (recenterTimeoutRef.current) {
          window.clearTimeout(recenterTimeoutRef.current);
        }
        recenterTimeoutRef.current = window.setTimeout(() => {
          requestRecenter();
        }, 90);
      }
    } catch {
      // Ignore load errors for now.
    }
  };

  const requestOpenCard = async (cardId: string) => {
    const currentTemplate = selectedTemplateId;
    if (currentTemplate && isDirtyByTemplate[currentTemplate]) {
      const record = await getCard(cardId);
      if (!record) return;
      setPendingOpenCard(record);
      setIsSavePromptOpen(true);
      return;
    }
    await openCard(cardId);
  };

  useEffect(() => {
    if (!activeCardId) {
      setCurrentCard(null);
      return;
    }
    let active = true;
    getCard(activeCardId)
      .then((record) => {
        if (!active) return;
        setCurrentCard(record ?? null);
      })
      .catch(() => {
        if (!active) return;
        setCurrentCard(null);
      });
    return () => {
      active = false;
    };
  }, [activeCardId, saveToken]);

  useEffect(() => {
    if (currentThumbnailUrl) {
      URL.revokeObjectURL(currentThumbnailUrl);
    }
    if (currentCard?.thumbnailBlob instanceof Blob) {
      const nextUrl = URL.createObjectURL(currentCard.thumbnailBlob);
      setCurrentThumbnailUrl(nextUrl);
      return () => {
        URL.revokeObjectURL(nextUrl);
      };
    }
    setCurrentThumbnailUrl(null);
    return undefined;
  }, [currentCard?.thumbnailBlob]);

  useEffect(() => {
    let active = true;
    const pairedId = draft?.pairedWith ?? null;
    if (!pairedId) {
      setPairedCard(null);
      return () => {
        active = false;
      };
    }
    getCard(pairedId)
      .then((record) => {
        if (!active) return;
        setPairedCard(record);
      })
      .catch(() => {
        if (!active) return;
        setPairedCard(null);
      });
    return () => {
      active = false;
    };
  }, [draft?.pairedWith]);

  useEffect(() => {
    if (effectiveFace !== "back") {
      setPairedFronts([]);
      return;
    }
    if (!activeCardId) {
      setPairedFronts([]);
      return;
    }
    let active = true;
    listCards({ status: "saved" })
      .then((cards) => {
        if (!active) return;
        const matches = cards.filter((card) => card.pairedWith === activeCardId);
        matches.sort((a, b) => {
          const aViewed = a.lastViewedAt ?? 0;
          const bViewed = b.lastViewedAt ?? 0;
          if (bViewed !== aViewed) return bViewed - aViewed;
          if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
          const aName = a.nameLower ?? a.name.toLocaleLowerCase();
          const bName = b.nameLower ?? b.name.toLocaleLowerCase();
          return aName.localeCompare(bName);
        });
        setPairedFronts(matches);
      })
      .catch(() => {
        if (!active) return;
        setPairedFronts([]);
      });

    return () => {
      active = false;
    };
  }, [activeCardId, effectiveFace, pairedFrontsToken]);

  useEffect(() => {
    if (pairedThumbnailUrl) {
      URL.revokeObjectURL(pairedThumbnailUrl);
    }
    if (pairedCard?.thumbnailBlob instanceof Blob) {
      const nextUrl = URL.createObjectURL(pairedCard.thumbnailBlob);
      setPairedThumbnailUrl(nextUrl);
      return () => {
        URL.revokeObjectURL(nextUrl);
      };
    }
    setPairedThumbnailUrl(null);
    return undefined;
  }, [pairedCard?.thumbnailBlob]);

  const applyFaceChange = (nextFace: CardFace) => {
    if (!currentTemplateId) return;
    const nextDraft = {
      ...(draft ?? {}),
      face: nextFace,
      pairedWith: nextFace === "back" ? null : draft?.pairedWith,
    } as CardDataByTemplate[TemplateId];
    setCardDraft(currentTemplateId, nextDraft);
    setTemplateDirty(currentTemplateId, true);
    if (ENABLE_WEBGL_RECENTER_ON_FACE_SELECT) {
      if (recenterTimeoutRef.current) {
        window.clearTimeout(recenterTimeoutRef.current);
      }
      recenterTimeoutRef.current = window.setTimeout(() => {
        requestRecenter();
      }, 90);
    }
  };

  const handleFaceChange = async (nextFace: CardFace) => {
    try {
      if (!template || !currentTemplateId) return;
      if (!effectiveFace || nextFace === effectiveFace) return;
      if (isDirtyByTemplate[currentTemplateId]) {
        setPendingFaceChange(nextFace);
        setIsSavePromptOpen(true);
        return;
      }

      if (nextFace === "back") {
        const pairedId = draft?.pairedWith ?? null;
        if (pairedId) {
          const pairedRecord = await getCard(pairedId);
          const pairedTitle = pairedRecord?.title ?? FALLBACK_TITLE;
          setPendingChange({
            mode: "front-to-back",
            nextFace,
            pairedTitle,
          });
          return;
        }
      }

      if (nextFace === "front" && effectiveFace === "back" && activeCardId) {
        const cards = await listCards();
        const affected = cards.filter((card) => card.pairedWith === activeCardId);
        if (affected.length > 0) {
          setPendingChange({
            mode: "back-to-front",
            nextFace,
            affectedFrontIds: affected.map((card) => card.id),
            affectedCount: affected.length,
          });
          return;
        }
      }

      applyFaceChange(nextFace);
    } catch {
      // Ignore card lookup errors; the face change can be retried by the user.
    }
  };

  const confirmBody = pendingChange
    ? pendingChange.mode === "front-to-back"
      ? `Confirm unpairing from card ${pendingChange.pairedTitle}`
      : `Confirm unpairing of this card to the ${pendingChange.affectedCount} cards`
    : "";

  const currentTemplateThumbnail = template?.thumbnail ?? null;
  const pairedThumbnail = pairedCard ? cardTemplatesById[pairedCard.templateId]?.thumbnail : null;
  const pairedTitle = pairedCard?.title ?? FALLBACK_TITLE;
  const hasPair = Boolean(draft?.pairedWith && pairedCard);
  const visibleFronts = pairedFronts.slice(0, 8);
  const overflowCount = pairedFronts.length > 8 ? pairedFronts.length - 8 : 0;
  const shouldShowOverflowPopover = isOverflowPopoverOpen && overflowPopoverAnchor;

  return (
    <>
      <div className={styles.inspectorHeader}>
        <div className={styles.inspectorHeaderPreview} aria-hidden="true">
          <div className={styles.inspectorHeaderPreviewInner}>
            {currentThumbnailUrl ? (
              <img src={currentThumbnailUrl} alt="" />
            ) : currentTemplateThumbnail?.src ? (
              <img src={currentTemplateThumbnail.src} alt="" />
            ) : (
              <div className={styles.inspectorHeaderPreviewPlaceholder} />
            )}
          </div>
        </div>
        <div className={styles.inspectorHeaderContent}>
          <div className={styles.inspectorSectionTitle}>
            {t("actions.template")} -{" "}
            {template ? getTemplateNameLabel(language, template) : t("ui.loading")}
          </div>
          <div className={styles.inspectorPairRow}>
        <div className={styles.inspectorFaceMenu} ref={faceMenuRef}>
          <button
            type="button"
            className={`${styles.inspectorFaceButton} ${
              isInferredFace ? styles.inspectorFaceButtonInferred : ""
            }`}
            aria-label={t("aria.cardFace")}
            aria-expanded={isFaceMenuOpen}
            disabled={!template || Boolean(pendingChange) || isConfirming}
            onClick={() => setIsFaceMenuOpen((prev) => !prev)}
          >
            {effectiveFace === "back" ? (
              <SendToBack size={16} className={styles.inspectorFaceItemIcon} />
            ) : (
              <BringToFront size={16} className={styles.inspectorFaceItemIcon} />
            )}
            <span>
              {effectiveFace === "back" ? t("cardFace.backFacing") : t("cardFace.frontFacing")}
            </span>
          </button>
          {isFaceMenuOpen ? (
            <div className={styles.inspectorFacePopover} role="menu">
              <button
                type="button"
                className={styles.inspectorFaceItem}
                role="menuitem"
                onClick={() => {
                  setIsFaceMenuOpen(false);
                  void handleFaceChange("front");
                }}
              >
                <BringToFront className={styles.inspectorFaceItemIcon} aria-hidden="true" />
                {t("cardFace.frontFacing")}
              </button>
              <button
                type="button"
                className={styles.inspectorFaceItem}
                role="menuitem"
                onClick={() => {
                  setIsFaceMenuOpen(false);
                  void handleFaceChange("back");
                }}
              >
                <SendToBack className={styles.inspectorFaceItemIcon} aria-hidden="true" />
                {t("cardFace.backFacing")}
              </button>
            </div>
          ) : null}
        </div>
        {effectiveFace === "front" ? (
          <>
            <button
              type="button"
              className={`${styles.inspectorPairActionButton} ${
                hasPair ? "" : styles.inspectorPairActionButtonEmpty
              }`}
              title={t("tooltip.pairBack")}
              onClick={() => {
                openStockpile({
                  mode: "pair-backs",
                  titleOverride: t("heading.selectBackCard"),
                  initialSelectedIds: draft?.pairedWith ? [draft.pairedWith] : [],
                  onConfirmSelection: (cardIds) => {
                    const selectedId = cardIds?.[0];
                    if (!selectedId || !currentTemplateId) return;
                    const nextDraft = {
                      ...(draft ?? {}),
                      pairedWith: selectedId,
                      face: draft?.face ?? template?.defaultFace,
                    } as CardDataByTemplate[TemplateId];
                    setCardDraft(currentTemplateId, nextDraft);
                    setTemplateDirty(currentTemplateId, true);
                  },
                });
              }}
            >
              <Combine aria-hidden="true" />
            </button>
            <div
              className={styles.inspectorPairThumb}
              role={hasPair ? "button" : undefined}
              tabIndex={hasPair ? 0 : -1}
              onClick={async () => {
                if (!hasPair || !pairedCard) return;
                await requestOpenCard(pairedCard.id);
              }}
              onKeyDown={async (event) => {
                if (!hasPair || !pairedCard) return;
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                await requestOpenCard(pairedCard.id);
              }}
            >
              <div className={styles.inspectorPairThumbInner}>
                {pairedThumbnailUrl ? (
                  <img src={pairedThumbnailUrl} alt="" />
                ) : pairedThumbnail?.src ? (
                  <img src={pairedThumbnail.src} alt="" />
                ) : (
                  <div className={styles.inspectorPairThumbPlaceholder} />
                )}
              </div>
              {hasPair ? (
                <div className={styles.inspectorPairThumbPopover} aria-hidden="true">
                  {pairedThumbnailUrl ? (
                    <img src={pairedThumbnailUrl} alt="" />
                  ) : pairedThumbnail?.src ? (
                    <img src={pairedThumbnail.src} alt="" />
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className={styles.inspectorPairTitle}>
              {hasPair ? pairedTitle : t("cardFace.unpaired")}
            </div>
            <div className={styles.inspectorPairActions}>
              {hasPair ? (
                <button
                  type="button"
                  className={styles.inspectorPairActionButton}
                  title={t("tooltip.unpairBack")}
                  onClick={() => {
                    if (!currentTemplateId) return;
                    const nextDraft = {
                      ...(draft ?? {}),
                      pairedWith: null,
                    } as CardDataByTemplate[TemplateId];
                    setCardDraft(currentTemplateId, nextDraft);
                    setTemplateDirty(currentTemplateId, true);
                  }}
                >
                  <Unlink2 aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </>
        ) : null}
        {effectiveFace === "back" ? (
          <>
            <button
              type="button"
              className={`${styles.inspectorPairActionButton} ${
                pairedFronts.length > 0 ? "" : styles.inspectorPairActionButtonEmpty
              }`}
              title={t("tooltip.managePairings")}
              onClick={() => {
                if (!activeCardId) return;
                openStockpile({
                  mode: "pair-fronts",
                  titleOverride: t("heading.manageFrontPairings"),
                  initialSelectedIds: pairedFronts.map((card) => card.id),
                  onConfirmSelection: async (cardIds) => {
                    if (!cardIds.length) return;
                    try {
                      await updateCards(cardIds, { pairedWith: activeCardId, face: "front" });
                      setPairedFrontsToken((prev) => prev + 1);
                    } catch {
                      // Ignore update errors for now.
                    }
                  },
                });
              }}
            >
              <Combine aria-hidden="true" />
            </button>
            <div className={styles.inspectorStack}>
              {visibleFronts.map((card, index) => {
                const thumbUrl =
                  typeof window !== "undefined" && card.thumbnailBlob
                    ? URL.createObjectURL(card.thumbnailBlob)
                    : null;
                const templateThumb = cardTemplatesById[card.templateId]?.thumbnail;
                return (
                  <div
                    key={card.id}
                    className={styles.inspectorStackItem}
                    style={{ zIndex: index + 1 }}
                    onClick={async () => {
                      await requestOpenCard(card.id);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={async (event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      await requestOpenCard(card.id);
                    }}
                  >
                    <div className={styles.inspectorStackThumbInner}>
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrl}
                          alt=""
                          onLoad={() => {
                            URL.revokeObjectURL(thumbUrl);
                          }}
                        />
                      ) : templateThumb?.src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={templateThumb.src} alt="" />
                      ) : (
                        <div className={styles.inspectorStackPlaceholder} />
                      )}
                    </div>
                    <div className={styles.inspectorStackPopover} aria-hidden="true">
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbUrl} alt="" />
                      ) : templateThumb?.src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={templateThumb.src} alt="" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {overflowCount > 0 ? (
                <div
                  className={`${styles.inspectorStackItem} ${styles.inspectorStackOverflowItem}`}
                  style={{ zIndex: visibleFronts.length + 1 }}
                  onMouseEnter={(event) => {
                    if (overflowHoverTimeoutRef.current) {
                      window.clearTimeout(overflowHoverTimeoutRef.current);
                    }
                    const rect = event.currentTarget.getBoundingClientRect();
                    setOverflowPopoverAnchor({
                      rect: {
                        top: rect.top,
                        left: rect.left,
                        bottom: rect.bottom,
                        right: rect.right,
                      },
                    });
                    setIsOverflowPopoverOpen(true);
                  }}
                  onMouseLeave={() => {
                    if (overflowHoverTimeoutRef.current) {
                      window.clearTimeout(overflowHoverTimeoutRef.current);
                    }
                    overflowHoverTimeoutRef.current = window.setTimeout(() => {
                      setIsOverflowPopoverOpen(false);
                      setOverflowPopoverAnchor(null);
                    }, 200);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (overflowHoverTimeoutRef.current) {
                      window.clearTimeout(overflowHoverTimeoutRef.current);
                    }
                    const rect = event.currentTarget.getBoundingClientRect();
                    setOverflowPopoverAnchor({
                      rect: {
                        top: rect.top,
                        left: rect.left,
                        bottom: rect.bottom,
                        right: rect.right,
                      },
                    });
                    setIsOverflowPopoverOpen(true);
                  }}
                >
                  <div className={styles.inspectorStackOverflow}>+{overflowCount}</div>
                </div>
              ) : null}
            </div>
            <div className={styles.inspectorPairActions} />
          </>
        ) : null}
      </div>
    </div>
  </div>
  {shouldShowOverflowPopover && typeof document !== "undefined"
        ? (() => {
            const tileWidth = 100;
            const tileHeight = 140;
            const tileGap = 8;
            const columns = 5;
            const padding = 16;
            const popoverWidth = padding * 2 + columns * tileWidth + (columns - 1) * tileGap;
            const popoverMaxHeight = 300;
            const left = Math.min(
              overflowPopoverAnchor.rect.left,
              window.innerWidth - popoverWidth - 16,
            );
            const top = Math.min(
              overflowPopoverAnchor.rect.bottom + 6,
              window.innerHeight - popoverMaxHeight - 16,
            );
            return createPortal(
              <div
                className={styles.inspectorStackOverflowPopover}
                style={{ left, top, width: popoverWidth }}
                onMouseEnter={() => {
                  if (overflowHoverTimeoutRef.current) {
                    window.clearTimeout(overflowHoverTimeoutRef.current);
                  }
                  setIsOverflowPopoverOpen(true);
                }}
                onMouseLeave={() => {
                  if (overflowHoverTimeoutRef.current) {
                    window.clearTimeout(overflowHoverTimeoutRef.current);
                  }
                  overflowHoverTimeoutRef.current = window.setTimeout(() => {
                    setIsOverflowPopoverOpen(false);
                    setOverflowPopoverAnchor(null);
                  }, 200);
                }}
              >
                <div className={styles.inspectorStackOverflowGrid}>
                  {pairedFronts.map((card) => {
                    const thumbUrl =
                      typeof window !== "undefined" && card.thumbnailBlob
                        ? URL.createObjectURL(card.thumbnailBlob)
                        : null;
                    const templateThumb = cardTemplatesById[card.templateId]?.thumbnail;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        className={styles.inspectorStackOverflowGridItem}
                        onClick={async (event) => {
                          event.stopPropagation();
                          await requestOpenCard(card.id);
                          setIsOverflowPopoverOpen(false);
                          setOverflowPopoverAnchor(null);
                        }}
                      >
                        {thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbUrl}
                            alt=""
                            onLoad={() => {
                              URL.revokeObjectURL(thumbUrl);
                            }}
                          />
                        ) : templateThumb?.src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={templateThumb.src} alt="" />
                        ) : (
                          <div className={styles.inspectorStackPlaceholder} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>,
              document.body,
            );
          })()
        : null}
      <ConfirmModal
        isOpen={Boolean(pendingChange)}
        title={t("actions.confirm")}
        confirmLabel={t("actions.confirm")}
        cancelLabel={t("actions.cancel")}
        isConfirming={isConfirming}
        onConfirm={async () => {
          if (!pendingChange) return;
          setIsConfirming(true);
          try {
            if (pendingChange.mode === "back-to-front") {
              await Promise.all(
                pendingChange.affectedFrontIds.map((id) => updateCard(id, { pairedWith: null })),
              );
            }
            applyFaceChange(pendingChange.nextFace);
          } finally {
            setIsConfirming(false);
            setPendingChange(null);
          }
        }}
        onCancel={() => {
          setPendingChange(null);
        }}
      >
        {confirmBody}
      </ConfirmModal>
      <ConfirmModal
        isOpen={isSavePromptOpen}
        title={t("heading.saveBeforeView")}
        confirmLabel={t("actions.save")}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          setIsSavePromptOpen(false);
          const nextOpenCard = pendingOpenCard;
          const nextFace = pendingFaceChange;
          setPendingOpenCard(null);
          setPendingFaceChange(null);
          const saved = await saveCurrentCard();
          if (!saved) return;
          if (nextOpenCard) {
            await openCard(nextOpenCard.id);
            return;
          }
          if (nextFace) {
            await handleFaceChange(nextFace);
          }
        }}
        onCancel={() => {
          setIsSavePromptOpen(false);
          setPendingOpenCard(null);
          setPendingFaceChange(null);
        }}
      >
        {t("confirm.saveBeforeViewBody")}
      </ConfirmModal>
    </>
  );
}
