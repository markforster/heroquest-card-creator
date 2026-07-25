"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { apiClient } from "@/api/client";
import { resolvePairedOppositeFace } from "@/components/App/pages/cards/pairedFaceResolver";
import { useEditorTargets } from "@/components/Cards/CardEditor/EditorTargetsContext";
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
import { collectCardAssetIds, collectCardHeroBackLogoIds } from "@/lib/card-assets";
import { resolveEffectiveFace } from "@/lib/card-face";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
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
  const { setHoveredTargetId } = useEditorTargets();
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
    state: { selectedTemplateId, activeCardIdByTemplate },
  } = useCardEditor();
  const { control } = useFormContext();
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

  const cardData = useWatch({ control }) as CardDataByTemplate[TemplateId] | undefined;
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
  const heroBackLogoIds = useMemo(() => collectCardHeroBackLogoIds(cardData), [cardData]);

  useEffect(() => {
    setHoveredTargetId(null);
  }, [previewRenderer, setHoveredTargetId]);

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
          if (assetIds.length || heroBackLogoIds.length) {
            await waitForAssetElements(() => handle.getSvgElement(), assetIds, heroBackLogoIds);
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
    heroBackLogoIds,
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
            const cards = await apiClient.listCards({ queries: { status: "saved" } });
            if (!active) return;
            const pairs = await apiClient.listPairs({ queries: { faceId: activeCardId } });
            if (!active) return;
            const result = resolvePairedOppositeFace({
              activeFaceId: activeCardId,
              effectiveFace: "front",
              preferredOppositeFaceId: preferredBackId,
              pairs,
              cards,
            });
            backId = result.resolvedCardId;
          }
          if (!backId) {
            setReverseCard(null);
            return;
          }
          const record = await apiClient.getCard({ params: { id: backId } });
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
          const cards = await apiClient.listCards({ queries: { status: "saved" } });
          if (!active) return;
          const pairs = await apiClient.listPairs({ queries: { faceId: activeCardId } });
          if (!active) return;
          const { resolvedCardId } = resolvePairedOppositeFace({
            activeFaceId: activeCardId,
            effectiveFace: "back",
            pairs,
            cards,
          });
          if (!resolvedCardId) {
            setReverseCard(null);
            return;
          }
          const record = await apiClient.getCard({ params: { id: resolvedCardId } });
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
  const reverseHeroBackLogoIds = useMemo(
    () => collectCardHeroBackLogoIds(reverseCard?.cardData),
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
          if (reverseAssetIds.length || reverseHeroBackLogoIds.length) {
            await waitForAssetElements(
              () => handle.getSvgElement(),
              reverseAssetIds,
              reverseHeroBackLogoIds,
            );
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
    reverseHeroBackLogoIds,
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
