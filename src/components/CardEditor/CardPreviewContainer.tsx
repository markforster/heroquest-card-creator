"use client";

import CardPreview, { CardPreviewHandle } from "@/components/CardPreview";
import WebglPreview from "@/components/CardPreview/WebglPreview";
import { usePreviewRenderer } from "@/components/PreviewRendererContext";
import { cardTemplatesById } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import type { TemplateId } from "@/types/templates";

import { useCardEditor } from "./CardEditorContext";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import styles from "./CardPreviewContainer.module.css";

type CardPreviewContainerProps = {
  previewRef: RefObject<CardPreviewHandle>;
};

export default function CardPreviewContainer({ previewRef }: CardPreviewContainerProps) {
  const { language } = useI18n();
  const { previewRenderer } = usePreviewRenderer();
  const [textureCanvas, setTextureCanvas] = useState<HTMLCanvasElement | null>(null);
  const [textureVersion, setTextureVersion] = useState(0);
  const renderInFlightRef = useRef(false);
  const renderRequestIdRef = useRef(0);
  const debounceTimeoutRef = useRef<number | null>(null);
  const {
    state: { selectedTemplateId, cardDrafts },
  } = useCardEditor();

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

  useEffect(() => {
    if (!showWebgl) return;

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
  }, [showWebgl, cardData, template.id, templateName, previewRef]);

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
      {showWebgl ? (
        <WebglPreview
          className={styles.webglLayer}
          textureCanvas={textureCanvas}
          textureVersion={textureVersion}
        />
      ) : null}
    </div>
  );
}
