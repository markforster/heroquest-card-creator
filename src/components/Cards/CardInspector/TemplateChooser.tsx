"use client";

import { BringToFront, SendToBack } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";

import styles from "@/app/page.module.css";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useEditorSave } from "@/components/Providers/EditorSaveContext";
import { usePreviewRenderer } from "@/components/Providers/PreviewRendererContext";
import { formatMessage } from "@/components/Stockpile/stockpile-utils";
import { ENABLE_CARD_THUMB_CACHE, ENABLE_WEBGL_RECENTER_ON_FACE_SELECT } from "@/config/flags";
import { cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { apiClient } from "@/api/client";
import { resolveEffectiveFace } from "@/lib/card-face";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";
import type { CardFace } from "@/types/card-face";
import type { CardRecord } from "@/api/cards";
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

const SHOW_TEMPLATE_THUMB = false;

async function deletePairsForFrontId(frontId: string): Promise<void> {
  const pairs = await apiClient.listPairs({ queries: { faceId: frontId } });
  const deletions = pairs.filter(
    (pair) => pair.frontFaceId === frontId && pair.backFaceId,
  );
  await Promise.all(
    deletions.map((pair) =>
      apiClient.deletePair({
        frontFaceId: frontId,
        backFaceId: pair.backFaceId as string,
      }),
    ),
  );
}

export default function TemplateChooser() {
  const { t, language } = useI18n();
  const fallbackTitle = t("label.untitledCard");
  const formatMessageWith = useMemo(
    () => (key: string, vars: Record<string, string | number>) => formatMessage(t(key as never), vars),
    [t],
  );
  const { requestRecenter } = usePreviewRenderer();
  const recenterTimeoutRef = useRef<number | null>(null);
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
  } = useCardEditor();
  const { control, setValue } = useFormContext();
  const { isDirty } = useFormState({ control });
  const { saveCurrentCard, saveToken } = useEditorSave();
  const [pendingChange, setPendingChange] = useState<PendingFaceChange | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isFaceMenuOpen, setIsFaceMenuOpen] = useState(false);
  const [currentCard, setCurrentCard] = useState<CardRecord | null>(null);
  const currentThumbnailUrl = useCardThumbnailUrl(currentCard?.id ?? null, currentCard?.thumbnailBlob ?? null, {
    enabled: true,
    useCache: ENABLE_CARD_THUMB_CACHE,
  });
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
  const faceValue = useWatch({ control, name: "face" }) as CardFace | undefined;
  const activeCardId = currentTemplateId ? activeCardIdByTemplate[currentTemplateId] : undefined;
  const isDraftDirty = Boolean(activeCardId && isDirty);
  const isDraft = Boolean(currentTemplateId && !activeCardId);
  const statusLabel = isDraft
    ? t("label.draft")
    : isDraftDirty
      ? t("label.modified")
      : t("label.saved");
  const statusClass = isDraft
    ? styles.inspectorStatusDraft
    : isDraftDirty
      ? styles.inspectorStatusModified
      : styles.inspectorStatusSaved;

  const effectiveFace = useMemo<CardFace | undefined>(() => {
    if (!template) return undefined;
    return resolveEffectiveFace(faceValue, template.defaultFace);
  }, [faceValue, template]);
  const isInferredFace = Boolean(template && faceValue == null);

  useEffect(() => {
    if (!activeCardId) {
      setCurrentCard(null);
      return;
    }
    let active = true;
    apiClient
      .getCard({ params: { id: activeCardId } })
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

  const applyFaceChange = (nextFace: CardFace) => {
    if (!currentTemplateId) return;
    setValue("face", nextFace, { shouldDirty: true, shouldTouch: true });
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
      if (isDirty) {
        setPendingFaceChange(nextFace);
        setIsSavePromptOpen(true);
        return;
      }

      if (nextFace === "back") {
        if (activeCardId) {
          const pairs = await apiClient.listPairs({ queries: { faceId: activeCardId } });
          const match =
            pairs.find((pair) => pair.frontFaceId === activeCardId && pair.backFaceId) ??
            pairs.find((pair) => pair.backFaceId);
          if (match?.backFaceId) {
            const pairedRecord = await apiClient.getCard({
              params: { id: match.backFaceId },
            });
            const pairedTitle = pairedRecord?.title ?? fallbackTitle;
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
        const pairs = await apiClient.listPairs({ queries: { faceId: activeCardId } });
        const affectedIds = pairs
          .map((pair) => pair.frontFaceId)
          .filter((id): id is string => Boolean(id));
        const affected = affectedIds.length
          ? (await apiClient.listCards()).filter((card) => affectedIds.includes(card.id))
          : [];
        if (affected.length > 0) {
          if (affected.length <= 1) {
            await Promise.all(affected.map((card) => deletePairsForFrontId(card.id)));
            applyFaceChange(nextFace);
            return;
          }
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
      : formatMessageWith("warning.pairingLossMultiple", {
          count: pendingChange.affectedCount,
          back: currentCard?.title ?? fallbackTitle,
        })
    : "";

  const currentTemplateThumbnail = template?.thumbnail ?? null;

  return (
    <>
      <div className={styles.inspectorHeader}>
        {SHOW_TEMPLATE_THUMB ? (
          <div className={styles.inspectorHeaderPreview} aria-hidden="true">
            <div className={styles.inspectorHeaderPreviewInner}>
              {currentThumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentThumbnailUrl} alt="" />
              ) : currentTemplateThumbnail?.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentTemplateThumbnail.src} alt="" />
              ) : (
                <div className={styles.inspectorHeaderPreviewPlaceholder} />
              )}
            </div>
          </div>
        ) : null}
        <div className={styles.inspectorHeaderContent}>
          <div
            className={`${styles.inspectorHeaderRow} d-flex align-items-center justify-content-between gap-2`}
          >
            <div
              className={`${styles.inspectorSectionTitle} ${styles.inspectorHeaderTitle}`}
            >
              {t("actions.template")} -{" "}
              {template ? getTemplateNameLabel(language, template) : t("ui.loading")}
            </div>
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
            {currentTemplateId ? (
              <span
                className={`${styles.inspectorStatusBadge} ${styles.inspectorHeaderStatus} ${statusClass}`}
              >
                {statusLabel}
              </span>
            ) : null}
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
              await Promise.all(
                pendingChange.affectedFrontIds.map((id) => deletePairsForFrontId(id)),
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
