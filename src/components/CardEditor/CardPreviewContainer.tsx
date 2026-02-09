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
  const [textureUrl, setTextureUrl] = useState<string | null>(null);
  const revokeTimeoutRef = useRef<number | null>(null);
  const textureUrlRef = useRef<string | null>(null);
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

    const scheduleRevoke = (url: string) => {
      if (revokeTimeoutRef.current) {
        window.clearTimeout(revokeTimeoutRef.current);
      }
      revokeTimeoutRef.current = window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 2000);
    };

    const renderTexture = async () => {
      const handle = previewRef.current;
      if (!handle) return;
      try {
        const blob = await handle.renderToPngBlob({ width, height });
        if (!blob || cancelled) return;
        const url = URL.createObjectURL(blob);
        setTextureUrl((prev) => {
          if (prev) scheduleRevoke(prev);
          textureUrlRef.current = url;
          return url;
        });
      } catch {
        // Ignore texture render errors for now.
      }
    };

    const raf = window.requestAnimationFrame(() => {
      void renderTexture();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [showWebgl, cardData, template.id, templateName, previewRef]);

  useEffect(() => {
    return () => {
      if (revokeTimeoutRef.current) {
        window.clearTimeout(revokeTimeoutRef.current);
      }
      if (textureUrlRef.current) {
        URL.revokeObjectURL(textureUrlRef.current);
      }
    };
  }, []);

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
      {showWebgl ? <WebglPreview className={styles.webglLayer} textureUrl={textureUrl} /> : null}
    </div>
  );
}
