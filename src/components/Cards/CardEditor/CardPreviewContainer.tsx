"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import CardPreview, { CardPreviewHandle } from "@/components/Cards/CardPreview";
import WebglPreview from "@/components/Cards/CardPreview/WebglPreview";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useDebugVisuals } from "@/components/Providers/DebugVisualsContext";
import { usePreviewRenderer } from "@/components/Providers/PreviewRendererContext";
import { useTextFittingPreferences } from "@/components/Providers/TextFittingPreferencesContext";
import { waitForAssetElements } from "@/components/Stockpile/stockpile-utils";
import { KEEP_WEBGL_MOUNTED } from "@/config/flags";
import { cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { collectCardAssetIds } from "@/lib/card-assets";
import { resolveEffectiveFace } from "@/lib/card-face";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { getCard, listCards } from "@/lib/cards-db";
import { listPairsForFace } from "@/lib/pairs-service";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import styles from "./CardPreviewContainer.module.css";

import type { RefObject } from "react";

type CardPreviewContainerProps = {
  previewRef: RefObject<CardPreviewHandle>;
  preferredBackId?: string | null;
};

export default function CardPreviewContainer({
  previewRef,
  preferredBackId,
}: CardPreviewContainerProps) {
  const { language, t } = useI18n();
  const { previewRenderer, rotationResetToken, recenterToken } = usePreviewRenderer();
  const { preferences, isDragging } = useTextFittingPreferences();
  const { showTextBounds } = useDebugVisuals();
  const preferencesKey = JSON.stringify(preferences);
  const [textureCanvas, setTextureCanvas] = useState<HTMLCanvasElement | null>(null);
  const [textureVersion, setTextureVersion] = useState(0);
  const renderInFlightRef = useRef(false);
  const pendingRenderRef = useRef(false);
  const renderRequestIdRef = useRef(0);
  const debounceTimeoutRef = useRef<number | null>(null);
  const {
    state: { selectedTemplateId, draftTemplateId, draft, activeCardIdByTemplate },
  } = useCardEditor();
  const reversePreviewRef = useRef<CardPreviewHandle | null>(null);
  const [reverseCard, setReverseCard] = useState<{
    templateId: TemplateId;
    templateName: string;
    cardData: CardDataByTemplate[TemplateId];
  } | null>(null);

  const template = selectedTemplateId
    ? cardTemplatesById[selectedTemplateId as TemplateId]
    : undefined;
  const hasTemplate = Boolean(selectedTemplateId && template);

  const cardData =
    selectedTemplateId && draftTemplateId === selectedTemplateId && draft
      ? (draft as CardDataByTemplate[TemplateId])
      : undefined;
  const templateId = template?.id ?? "";
  const templateName = template ? getTemplateNameLabel(language, template) : "";
  const showWebgl = previewRenderer === "webgl";
  const activeCardId = selectedTemplateId
    ? activeCardIdByTemplate[selectedTemplateId as TemplateId]
    : undefined;
  const noPairingLabel = t("label.webglNoPairing");
  const effectiveFace = resolveEffectiveFace(
    cardData?.face,
    template?.defaultFace ?? "front",
  );
  const assetIds = useMemo(() => collectCardAssetIds(cardData), [cardData]);

  useEffect(() => {
    if (!showWebgl || isDragging) return;

    let cancelled = false;
    const width = 1463;
    const height = 2048;

    const renderTexture = async () => {
      const handle = previewRef.current;
      if (!handle) return;
      if (renderInFlightRef.current) {
        pendingRenderRef.current = true;
        return;
      }
      renderInFlightRef.current = true;

      try {
        while (!cancelled) {
          const currentRequestId = renderRequestIdRef.current;
          await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve());
          });
          await handle.waitForBackgroundLoaded?.();
          if (assetIds.length) {
            await waitForAssetElements(() => handle.getSvgElement(), assetIds);
          }
          const canvas = await handle.renderToCanvas({
            width,
            height,
            removeDebugBounds: false,
          });
          if (!canvas || cancelled) return;
          setTextureCanvas(canvas);
          setTextureVersion((prev) => prev + 1);
          if (currentRequestId === renderRequestIdRef.current) {
            break;
          }
        }
      } catch {
        // Ignore texture render errors for now.
      } finally {
        renderInFlightRef.current = false;
        if (pendingRenderRef.current && !cancelled) {
          pendingRenderRef.current = false;
          window.requestAnimationFrame(() => {
            if (!cancelled) {
              void renderTexture();
            }
          });
        }
      }
    };

    if (debounceTimeoutRef.current) {
      window.clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = window.setTimeout(() => {
      renderRequestIdRef.current += 1;
      void renderTexture();
    }, 33);

    return () => {
      cancelled = true;
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    showWebgl,
    cardData,
    templateId,
    templateName,
    previewRef,
    preferencesKey,
    isDragging,
    showTextBounds,
    activeCardId,
    assetIds,
  ]);

  useEffect(() => {
    if (!cardData) return;
    const handle = previewRef.current;
    if (!handle?.syncCopyrightContrast) return;
    const timeoutId = window.setTimeout(() => {
      void handle.syncCopyrightContrast?.();
    }, 60);
    return () => window.clearTimeout(timeoutId);
  }, [cardData, templateId, templateName, previewRef]);

  useEffect(() => {
    if (!showWebgl) {
      setReverseCard(null);
      return;
    }
    let active = true;

    const updateReverseCard = async () => {
      if (effectiveFace === "front") {
        try {
          let backId: string | null = null;
          if (activeCardId) {
            const pairs = await listPairsForFace(activeCardId);
            const preferredMatch = preferredBackId
              ? pairs.find((pair) => pair.backFaceId === preferredBackId)
              : undefined;
            const match =
              preferredMatch ??
              pairs.find((pair) => pair.frontFaceId === activeCardId && pair.backFaceId) ??
              pairs.find((pair) => pair.backFaceId);
            backId = match?.backFaceId ?? null;
          }
          if (!backId) {
            setReverseCard(null);
            return;
          }
          const record = await getCard(backId);
          if (!active || !record) {
            setReverseCard(null);
            return;
          }
          const pairedTemplate = cardTemplatesById[record.templateId];
          if (!pairedTemplate) {
            setReverseCard(null);
            return;
          }
          const pairedData = cardRecordToCardData(record);
          setReverseCard({
            templateId: record.templateId,
            templateName: getTemplateNameLabel(language, pairedTemplate),
            cardData: pairedData,
          });
        } catch {
          if (active) {
            setReverseCard(null);
          }
        }
        return;
      }

      if (effectiveFace === "back") {
        if (!activeCardId) {
          setReverseCard(null);
          return;
        }
        try {
          const cards = await listCards({ status: "saved" });
          if (!active) return;
          const pairs = await listPairsForFace(activeCardId);
          if (!active) return;
          const frontIds = new Set(
            pairs.map((pair) => pair.frontFaceId).filter((id): id is string => Boolean(id)),
          );
          const matches = cards.filter((card) => frontIds.has(card.id));
          matches.sort((a, b) => {
            const aViewed = a.lastViewedAt ?? 0;
            const bViewed = b.lastViewedAt ?? 0;
            if (bViewed !== aViewed) return bViewed - aViewed;
            if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
            const aName = a.nameLower ?? a.name.toLocaleLowerCase();
            const bName = b.nameLower ?? b.name.toLocaleLowerCase();
            return aName.localeCompare(bName);
          });
          const preferred = matches[0];
          if (!preferred) {
            setReverseCard(null);
            return;
          }
          const pairedTemplate = cardTemplatesById[preferred.templateId];
          if (!pairedTemplate) {
            setReverseCard(null);
            return;
          }
          const pairedData = cardRecordToCardData(preferred);
          setReverseCard({
            templateId: preferred.templateId,
            templateName: getTemplateNameLabel(language, pairedTemplate),
            cardData: pairedData,
          });
        } catch {
          if (active) {
            setReverseCard(null);
          }
        }
        return;
      }

      setReverseCard(null);
    };

    void updateReverseCard();

    return () => {
      active = false;
    };
  }, [activeCardId, effectiveFace, language, showWebgl, preferredBackId]);

  const [reverseTextureCanvas, setReverseTextureCanvas] = useState<HTMLCanvasElement | null>(null);
  const [reverseTextureVersion, setReverseTextureVersion] = useState(0);
  const reverseRenderInFlightRef = useRef(false);
  const reverseRenderRequestIdRef = useRef(0);
  const reverseDebounceTimeoutRef = useRef<number | null>(null);
  const reverseAssetIds = useMemo(
    () => collectCardAssetIds(reverseCard?.cardData),
    [reverseCard?.cardData],
  );

  useEffect(() => {
    if (!showWebgl || !reverseCard || isDragging) {
      setReverseTextureCanvas(null);
      return;
    }

    let cancelled = false;
    const width = 1463;
    const height = 2048;

    const renderTexture = async () => {
      const handle = reversePreviewRef.current;
      if (!handle) return;
      if (reverseRenderInFlightRef.current) return;
      reverseRenderInFlightRef.current = true;

      try {
        while (!cancelled) {
          const currentRequestId = reverseRenderRequestIdRef.current;
          await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve());
          });
          await handle.waitForBackgroundLoaded?.();
          if (reverseAssetIds.length) {
            await waitForAssetElements(() => handle.getSvgElement(), reverseAssetIds);
          }
          const canvas = await handle.renderToCanvas({
            width,
            height,
            removeDebugBounds: false,
          });
          if (!canvas || cancelled) return;
          setReverseTextureCanvas(canvas);
          setReverseTextureVersion((prev) => prev + 1);
          if (currentRequestId === reverseRenderRequestIdRef.current) {
            break;
          }
        }
      } catch {
        // Ignore texture render errors for now.
      } finally {
        reverseRenderInFlightRef.current = false;
      }
    };

    if (reverseDebounceTimeoutRef.current) {
      window.clearTimeout(reverseDebounceTimeoutRef.current);
    }
    reverseDebounceTimeoutRef.current = window.setTimeout(() => {
      reverseRenderRequestIdRef.current += 1;
      void renderTexture();
    }, 33);

    return () => {
      cancelled = true;
      if (reverseDebounceTimeoutRef.current) {
        window.clearTimeout(reverseDebounceTimeoutRef.current);
      }
    };
  }, [
    showWebgl,
    reverseCard,
    reversePreviewRef,
    preferencesKey,
    isDragging,
    showTextBounds,
    reverseAssetIds,
  ]);

  useEffect(() => {
    if (!showWebgl) return;
    setTextureCanvas(null);
    setReverseTextureCanvas(null);
  }, [activeCardId, showWebgl]);

  if (!hasTemplate || !template) {
    return null;
  }

  return (
    <div className={styles.previewSwap}>
      <div className={`${styles.previewLayer} ${showWebgl ? styles.previewHidden : ""}`}>
        <CardPreview
          ref={previewRef}
          templateId={template.id}
          templateName={templateName}
          backgroundSrc={template.background}
          cardData={cardData}
          copyrightTextColor={cardData?.copyrightColor}
        />
      </div>
      {showWebgl && reverseCard ? (
        <div className={styles.previewGhost} aria-hidden="true">
          <CardPreview
            ref={reversePreviewRef}
            templateId={reverseCard.templateId}
            templateName={reverseCard.templateName}
            backgroundSrc={cardTemplatesById[reverseCard.templateId]?.background}
            cardData={reverseCard.cardData}
            copyrightTextColor={reverseCard.cardData?.copyrightColor}
          />
        </div>
      ) : null}
      {KEEP_WEBGL_MOUNTED ? (
        <WebglPreview
          className={`${styles.webglLayer} ${showWebgl ? "" : styles.previewHidden}`}
          isVisible={showWebgl}
          frontTextureCanvas={textureCanvas}
          frontTextureVersion={textureVersion}
          backTextureCanvas={reverseTextureCanvas}
          backTextureVersion={reverseTextureVersion}
          rotationResetToken={rotationResetToken}
          recenterToken={recenterToken}
          unpairedLabel={noPairingLabel}
        />
      ) : showWebgl ? (
        <WebglPreview
          className={styles.webglLayer}
          isVisible
          frontTextureCanvas={textureCanvas}
          frontTextureVersion={textureVersion}
          backTextureCanvas={reverseTextureCanvas}
          backTextureVersion={reverseTextureVersion}
          rotationResetToken={rotationResetToken}
          recenterToken={recenterToken}
          unpairedLabel={noPairingLabel}
        />
      ) : null}
    </div>
  );
}
