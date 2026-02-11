"use client";

import { useEffect, useRef, useState } from "react";

import CardPreview, { CardPreviewHandle } from "@/components/CardPreview";
import WebglPreview from "@/components/CardPreview/WebglPreview";
import { usePreviewRenderer } from "@/components/PreviewRendererContext";
import { useTextFittingPreferences } from "@/components/TextFittingPreferencesContext";
import { cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { getCard, listCards } from "@/lib/cards-db";
import type { CardDataByTemplate } from "@/types/card-data";
import type { CardFace } from "@/types/card-face";
import type { TemplateId } from "@/types/templates";

import { useCardEditor } from "./CardEditorContext";
import styles from "./CardPreviewContainer.module.css";

import type { RefObject } from "react";

type CardPreviewContainerProps = {
  previewRef: RefObject<CardPreviewHandle>;
};

export default function CardPreviewContainer({ previewRef }: CardPreviewContainerProps) {
  const { language } = useI18n();
  const { previewRenderer } = usePreviewRenderer();
  const { preferences, isDragging } = useTextFittingPreferences();
  const preferencesKey = JSON.stringify(preferences);
  const [textureCanvas, setTextureCanvas] = useState<HTMLCanvasElement | null>(null);
  const [textureVersion, setTextureVersion] = useState(0);
  const renderInFlightRef = useRef(false);
  const renderRequestIdRef = useRef(0);
  const debounceTimeoutRef = useRef<number | null>(null);
  const {
    state: { selectedTemplateId, cardDrafts, activeCardIdByTemplate },
  } = useCardEditor();
  const reversePreviewRef = useRef<CardPreviewHandle | null>(null);
  const [reverseCard, setReverseCard] = useState<{
    templateId: TemplateId;
    templateName: string;
    cardData: CardDataByTemplate[TemplateId];
  } | null>(null);

  if (!selectedTemplateId) {
    return null;
  }

  const template = cardTemplatesById[selectedTemplateId as TemplateId];
  if (!template) {
    return null;
  }

  const cardData = cardDrafts[selectedTemplateId as TemplateId];
  const templateName = getTemplateNameLabel(language, template);
  const showWebgl = previewRenderer === "webgl";
  const activeCardId = activeCardIdByTemplate[selectedTemplateId as TemplateId];
  const effectiveFace = (cardData?.face ?? template.defaultFace) as CardFace;

  useEffect(() => {
    if (!showWebgl || isDragging) return;

    let cancelled = false;
    const width = 1463;
    const height = 2048;

    const renderTexture = async () => {
      const handle = previewRef.current;
      if (!handle) return;
      if (renderInFlightRef.current) return;
      renderInFlightRef.current = true;

      try {
        while (!cancelled) {
          const currentRequestId = renderRequestIdRef.current;
          await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve());
          });
          const canvas = await handle.renderToCanvas({ width, height });
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
  }, [showWebgl, cardData, template.id, templateName, previewRef, preferencesKey, isDragging]);

  useEffect(() => {
    if (!showWebgl) {
      setReverseCard(null);
      return;
    }
    let active = true;

    const updateReverseCard = async () => {
      if (effectiveFace === "front") {
        const pairedId = cardData?.pairedWith ?? null;
        if (!pairedId) {
          setReverseCard(null);
          return;
        }
        try {
          const record = await getCard(pairedId);
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
  }, [activeCardId, cardData?.pairedWith, effectiveFace, language, showWebgl]);

  const [reverseTextureCanvas, setReverseTextureCanvas] = useState<HTMLCanvasElement | null>(null);
  const [reverseTextureVersion, setReverseTextureVersion] = useState(0);
  const reverseRenderInFlightRef = useRef(false);
  const reverseRenderRequestIdRef = useRef(0);
  const reverseDebounceTimeoutRef = useRef<number | null>(null);

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
          const canvas = await handle.renderToCanvas({ width, height });
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
  }, [showWebgl, reverseCard, reversePreviewRef, preferencesKey, isDragging]);

  return (
    <div className={styles.previewSwap}>
      <div className={`${styles.previewLayer} ${showWebgl ? styles.previewHidden : ""}`}>
        <CardPreview
          ref={previewRef}
          templateId={template.id}
          templateName={templateName}
          backgroundSrc={template.background}
          cardData={cardData}
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
          />
        </div>
      ) : null}
      {showWebgl ? (
        <WebglPreview
          className={styles.webglLayer}
          frontTextureCanvas={textureCanvas}
          frontTextureVersion={textureVersion}
          backTextureCanvas={reverseTextureCanvas}
          backTextureVersion={reverseTextureVersion}
        />
      ) : null}
    </div>
  );
}
