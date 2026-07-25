"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import CardPreview, { type CardPreviewHandle } from "@/components/Cards/CardPreview";
import { waitForAssetElements, waitForFrame } from "@/components/Stockpile/stockpile-utils";
import { cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { collectCardAssetIds, collectCardHeroBackLogoIds } from "@/lib/card-assets";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { buildAssetCache, buildHeroBackLogoCache } from "@/lib/export-assets-cache";
import type { CardRecord } from "@/types/cards-db";
import type { TemplateId } from "@/types/templates";

type Job = {
  id: number;
  card: CardRecord;
  resolve: (blob: Blob | null) => void;
};

type HiddenCardThumbnailRefreshJobProps = {
  job: Job;
  onComplete: (jobId: number, blob: Blob | null) => void;
};

export type HiddenCardThumbnailRefreshHostHandle = {
  renderThumbnail: (card: CardRecord) => Promise<Blob | null>;
};

function HiddenCardThumbnailRefreshJob({ job, onComplete }: HiddenCardThumbnailRefreshJobProps) {
  const { language } = useI18n();
  const previewRef = useRef<CardPreviewHandle>(null);
  const template = cardTemplatesById[job.card.templateId as TemplateId] ?? null;
  const templateName = useMemo(
    () => (template ? getTemplateNameLabel(language, template) : ""),
    [language, template],
  );
  const cardData = useMemo(
    () => cardRecordToCardData(job.card as CardRecord & { templateId: TemplateId }),
    [job.card],
  );

  useEffect(() => {
    if (!template) {
      onComplete(job.id, null);
      return;
    }

    let active = true;
    let completed = false;

    const finish = (blob: Blob | null) => {
      if (!active || completed) return;
      completed = true;
      onComplete(job.id, blob);
    };

    void (async () => {
      const assetIds = collectCardAssetIds(cardData);
      const heroBackLogoIds = collectCardHeroBackLogoIds(cardData);
      const { cache: assetBlobsById } = await buildAssetCache(assetIds);
      const { cache: heroBackLogoBlobsById } = await buildHeroBackLogoCache(heroBackLogoIds);

      try {
        await waitForFrame();
        await waitForFrame();
        await previewRef.current?.waitForBackgroundLoaded?.();
        await previewRef.current?.syncCopyrightContrast?.();
        await waitForFrame();
        if (assetIds.length > 0 || heroBackLogoIds.length > 0) {
          await waitForAssetElements(
            () => previewRef.current?.getSvgElement(),
            assetIds,
            heroBackLogoIds,
          );
        }

        const blob =
          (await previewRef.current?.renderToJpegBlob({
            width: 225,
            height: 315,
            assetBlobsById,
            heroBackLogoBlobsById,
          })) ?? null;
        finish(blob);
      } catch (error) {
        console.warn("[thumbnail-refresh] Hidden thumbnail render job failed", {
          cardId: job.card.id,
          stage: "job",
          error,
        });
        finish(null);
      } finally {
        assetBlobsById.clear();
        heroBackLogoBlobsById.clear();
      }
    })();

    return () => {
      active = false;
    };
  }, [cardData, job.card.id, job.id, onComplete, template]);

  if (!template) {
    return null;
  }

  return (
    <div className={styles.bulkExportPreview} aria-hidden="true">
      <CardPreview
        ref={previewRef}
        templateId={template.id}
        templateName={templateName}
        backgroundSrc={template.background}
        cardData={cardData}
      />
    </div>
  );
}

export default forwardRef<HiddenCardThumbnailRefreshHostHandle>(function HiddenCardThumbnailRefreshHost(
  _props,
  ref,
) {
  const queueRef = useRef<Job[]>([]);
  const nextJobIdRef = useRef(1);
  const currentJobRef = useRef<Job | null>(null);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);

  const pumpQueue = () => {
    if (currentJobRef.current) {
      setCurrentJob(currentJobRef.current);
      return;
    }

    const next = queueRef.current.shift() ?? null;
    currentJobRef.current = next;
    setCurrentJob(next);
  };

  const handleComplete = useCallback((jobId: number, blob: Blob | null) => {
    const completedJob = currentJobRef.current;
    if (!completedJob || completedJob.id !== jobId) {
      return;
    }

    completedJob.resolve(blob);
    currentJobRef.current = null;
    setCurrentJob((existing) => (existing?.id === jobId ? null : existing));
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      renderThumbnail(card) {
        return new Promise<Blob | null>((resolve) => {
          queueRef.current.push({
            id: nextJobIdRef.current,
            card,
            resolve,
          });
          nextJobIdRef.current += 1;
          pumpQueue();
        });
      },
    }),
    [],
  );

  useEffect(() => {
    if (!currentJob && queueRef.current.length > 0) {
      pumpQueue();
    }
  }, [currentJob]);

  if (!currentJob) {
    return null;
  }

  return <HiddenCardThumbnailRefreshJob key={currentJob.id} job={currentJob} onComplete={handleComplete} />;
});
