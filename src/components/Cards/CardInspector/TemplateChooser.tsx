"use client";

import { BringToFront, SendToBack } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useEditorSave } from "@/components/Providers/EditorSaveContext";
import { usePreviewRenderer } from "@/components/Providers/PreviewRendererContext";
import { ENABLE_WEBGL_RECENTER_ON_FACE_SELECT } from "@/config/flags";
import { cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { getCard, listCards } from "@/lib/cards-db";
import { deletePairsForFront, listPairsForFace } from "@/lib/pairs-service";
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
    state: {
      selectedTemplateId,
      draftTemplateId,
      draft,
      activeCardIdByTemplate,
      isDirtyByTemplate,
    },
    setCardDraft,
    setSingleDraft,
    setTemplateDirty,
  } = useCardEditor();
  const { saveCurrentCard, saveToken } = useEditorSave();
  const [pendingChange, setPendingChange] = useState<PendingFaceChange | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isFaceMenuOpen, setIsFaceMenuOpen] = useState(false);
  const [currentCard, setCurrentCard] = useState<CardRecord | null>(null);
  const [currentThumbnailUrl, setCurrentThumbnailUrl] = useState<string | null>(null);
  const [currentThumbnailError, setCurrentThumbnailError] = useState(false);
  const [currentThumbnailDataUrl, setCurrentThumbnailDataUrl] = useState<string | null>(null);
  const [pendingFaceChange, setPendingFaceChange] = useState<CardFace | null>(null);
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
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
  const draftValue =
    currentTemplateId && draftTemplateId === currentTemplateId && draft
      ? (draft as CardDataByTemplate[TemplateId])
      : undefined;
  const activeCardId = currentTemplateId ? activeCardIdByTemplate[currentTemplateId] : undefined;
  const isDraftDirty = Boolean(currentTemplateId && isDirtyByTemplate[currentTemplateId]);
  const isDraft = Boolean(
    currentTemplateId && draftTemplateId === currentTemplateId && draft && !activeCardId,
  );

  const effectiveFace = useMemo<CardFace | undefined>(() => {
    if (!template) return undefined;
    return (draftValue?.face ?? template.defaultFace) as CardFace;
  }, [draftValue?.face, template]);
  const isInferredFace = Boolean(template && draftValue?.face == null);

  useEffect(() => {
    if (!activeCardId) {
      setCurrentCard(null);
      return;
    }
    let active = true;
    getCard(activeCardId)
      .then((record) => {
        if (!active) return;
        setCurrentCard(record);
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
      setCurrentThumbnailError(false);
      setCurrentThumbnailDataUrl(null);
      return () => {
        URL.revokeObjectURL(nextUrl);
      };
    }
    setCurrentThumbnailUrl(null);
    setCurrentThumbnailError(false);
    setCurrentThumbnailDataUrl(null);
    return undefined;
  }, [currentCard?.thumbnailBlob, isDraftDirty]);

  const applyFaceChange = (nextFace: CardFace) => {
    if (!currentTemplateId) return;
    const nextDraft = {
      ...(draftValue ?? {}),
      face: nextFace,
    } as CardDataByTemplate[TemplateId];
    setCardDraft(currentTemplateId, nextDraft);
    setSingleDraft(currentTemplateId, nextDraft);
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
        if (activeCardId) {
          const pairs = await listPairsForFace(activeCardId);
          const match =
            pairs.find((pair) => pair.frontFaceId === activeCardId && pair.backFaceId) ??
            pairs.find((pair) => pair.backFaceId);
          if (match?.backFaceId) {
            const pairedRecord = await getCard(match.backFaceId);
            const pairedTitle = pairedRecord?.title ?? FALLBACK_TITLE;
            setPendingChange({
              mode: "front-to-back",
              nextFace,
              pairedTitle,
            });
            return;
          }
        }
      }

      if (nextFace === "front" && effectiveFace === "back" && activeCardId) {
        const pairs = await listPairsForFace(activeCardId);
        const affectedIds = pairs
          .map((pair) => pair.frontFaceId)
          .filter((id): id is string => Boolean(id));
        const affected = affectedIds.length
          ? (await listCards()).filter((card) => affectedIds.includes(card.id))
          : [];
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

  return (
    <>
      <div className={styles.inspectorHeader}>
        <div className={styles.inspectorHeaderPreview} aria-hidden="true">
          <div className={styles.inspectorHeaderPreviewInner}>
            {currentThumbnailDataUrl ? (
              <img src={currentThumbnailDataUrl} alt="" />
            ) : currentThumbnailUrl && !currentThumbnailError ? (
              <img
                src={currentThumbnailUrl}
                alt=""
                onError={() => {
                  setCurrentThumbnailError(true);
                  if (!currentCard?.thumbnailBlob) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === "string") {
                      setCurrentThumbnailDataUrl(reader.result);
                    }
                  };
                  reader.readAsDataURL(currentCard.thumbnailBlob);
                }}
              />
            ) : currentTemplateThumbnail?.src ? (
              <img src={currentTemplateThumbnail.src} alt="" />
            ) : (
              <div className={styles.inspectorHeaderPreviewPlaceholder} />
            )}
          </div>
        </div>
        <div className={styles.inspectorHeaderContent}>
          <div className={styles.inspectorTemplateRow}>
            <div className={styles.inspectorSectionTitle}>
              {t("actions.template")} -{" "}
              {template ? getTemplateNameLabel(language, template) : t("ui.loading")}
            </div>
            {currentTemplateId ? (
              <span
                className={`${styles.inspectorStatusBadge} ${
                  isDraft ? styles.inspectorStatusDraft : styles.inspectorStatusSaved
                }`}
              >
                {isDraft ? t("label.draft") : t("label.saved")}
              </span>
            ) : null}
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
          </div>
        </div>
      </div>
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
              await Promise.all(pendingChange.affectedFrontIds.map((id) => deletePairsForFront(id)));
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
          const nextFace = pendingFaceChange;
          setPendingFaceChange(null);
          const saved = await saveCurrentCard();
          if (!saved) return;
          if (nextFace) {
            await handleFaceChange(nextFace);
          }
        }}
        onCancel={() => {
          setIsSavePromptOpen(false);
          setPendingFaceChange(null);
        }}
      >
        {t("confirm.saveBeforeViewBody")}
      </ConfirmModal>
    </>
  );
}
