"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import type { AssetRecord } from "@/api/assets";
import type { CardRecord } from "@/api/cards";
import { apiClient } from "@/api/client";
import styles from "@/app/page.module.css";
import { sortCardsByUpdated } from "@/components/Assets/asset-formatters";
import { getUsageBoundsForTemplate } from "@/components/Assets/asset-inspector-usage";
import AssetsInspectorActions from "@/components/Assets/AssetsInspectorActions";
import AssetsInspectorDetails from "@/components/Assets/AssetsInspectorDetails";
import AssetsInspectorHero from "@/components/Assets/AssetsInspectorHero";
import type { AssetUsage, AssetUsageBounds } from "@/components/Assets/AssetsRoutePanels.types";
import { AssetsPreviewModal } from "@/components/Assets/modals";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useAssetKindQueue } from "@/components/Providers/AssetKindBackfillProvider";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useEditorSave } from "@/components/Providers/EditorSaveContext";
import { usePreviewRenderer } from "@/components/Providers/PreviewRendererContext";
import { ENABLE_WEBGL_RECENTER_ON_FACE_SELECT } from "@/config/flags";
import { useI18n } from "@/i18n/I18nProvider";
import type { TemplateId } from "@/types/templates";

type AssetsInspectorProps = {
  assets: AssetRecord[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onReplaceComplete: () => void;
  onOptimizeComplete: () => void;
  refreshKey: number;
};

export default function AssetsInspector({
  assets,
  currentIndex,
  onSelectIndex,
  onReplaceComplete,
  onOptimizeComplete,
  refreshKey,
}: AssetsInspectorProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { requestRecenter } = usePreviewRenderer();
  const {
    state: { selectedTemplateId },
  } = useCardEditor();
  const { isDirty } = useFormState();
  const { saveCurrentCard } = useEditorSave();
  const { enqueueAsset } = useAssetKindQueue();

  const safeIndex = Math.min(currentIndex, assets.length - 1);
  const asset = assets[safeIndex];

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [assetBlob, setAssetBlob] = useState<Blob | null>(null);
  const [isOpaquePng, setIsOpaquePng] = useState(false);
  const [assetSizeBytes, setAssetSizeBytes] = useState<number | null>(null);
  const [usage, setUsage] = useState<AssetUsage>({ total: 0, cards: [] });
  const [usageBounds, setUsageBounds] = useState<AssetUsageBounds | null>(null);
  const [pendingOpenCard, setPendingOpenCard] = useState<CardRecord | null>(null);
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const recenterTimeoutRef = useRef<number | null>(null);
  const showCarousel = assets.length > 1;

  const openCard = async (cardId: string) => {
    navigate(`/cards/${cardId}`);
    if (ENABLE_WEBGL_RECENTER_ON_FACE_SELECT) {
      if (recenterTimeoutRef.current) {
        window.clearTimeout(recenterTimeoutRef.current);
      }
      recenterTimeoutRef.current = window.setTimeout(() => {
        requestRecenter();
      }, 90);
    }
  };

  const requestOpenCard = async (cardId: string) => {
    if (selectedTemplateId && isDirty) {
      const record = await apiClient.getCard({ params: { id: cardId } });
      if (!record) return;
      setPendingOpenCard(record);
      setIsSavePromptOpen(true);
      return;
    }
    await openCard(cardId);
  };

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setPreviewUrl(null);
    setIsPreviewLoading(true);

    (async () => {
      try {
        url = await apiClient.getAssetObjectUrl({ params: { id: asset.id } });
      } catch {
        url = null;
      }
      if (!cancelled) {
        setPreviewUrl(url);
        setIsPreviewLoading(false);
      } else if (url) {
        URL.revokeObjectURL(url);
      }
    })();

    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [asset.id, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setAssetSizeBytes(null);
    setAssetBlob(null);
    setIsOpaquePng(false);

    (async () => {
      try {
        const blob = await apiClient.getAssetBlob({ params: { id: asset.id } });
        if (cancelled) return;
        setAssetSizeBytes(blob?.size ?? null);
        setAssetBlob(blob ?? null);
      } catch {
        if (!cancelled) {
          setAssetSizeBytes(null);
          setAssetBlob(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [asset.id, refreshKey]);

  useEffect(() => {
    if (!assetBlob || asset.mimeType !== "image/png") {
      setIsOpaquePng(false);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        if (typeof createImageBitmap === "function") {
          const bitmap = await createImageBitmap(assetBlob);
          const canvas =
            typeof OffscreenCanvas === "function"
              ? new OffscreenCanvas(bitmap.width, bitmap.height)
              : document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d");
          if (!ctx || !("drawImage" in ctx) || !("getImageData" in ctx)) {
            bitmap.close?.();
            return;
          }
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close?.();
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let opaque = true;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] !== 255) {
              opaque = false;
              break;
            }
          }
          if (!cancelled) setIsOpaquePng(opaque);
          return;
        }

        const url = URL.createObjectURL(assetBlob);
        try {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Failed to load PNG"));
            img.src = url;
          });
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let opaque = true;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] !== 255) {
              opaque = false;
              break;
            }
          }
          if (!cancelled) setIsOpaquePng(opaque);
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch {
        if (!cancelled) setIsOpaquePng(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetBlob, asset.mimeType]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cards = await apiClient.listCards({ queries: { status: "saved" } });
        if (cancelled) return;
        const usedCards = new Map<string, CardRecord>();
        let maxWidth = 0;
        let maxHeight = 0;

        cards.forEach((card) => {
          let used = false;
          if (card.imageAssetId === asset.id) {
            used = true;
            const bounds = getUsageBoundsForTemplate(card.templateId as TemplateId, "image");
            if (bounds) {
              maxWidth = Math.max(maxWidth, bounds.width);
              maxHeight = Math.max(maxHeight, bounds.height);
            }
          }
          if (card.monsterIconAssetId === asset.id) {
            used = true;
            const bounds = getUsageBoundsForTemplate(card.templateId as TemplateId, "icon");
            if (bounds) {
              maxWidth = Math.max(maxWidth, bounds.width);
              maxHeight = Math.max(maxHeight, bounds.height);
            }
          }
          if (used) {
            usedCards.set(card.id, card);
          }
        });

        const matchedCards = sortCardsByUpdated(Array.from(usedCards.values()));
        setUsage({ total: matchedCards.length, cards: matchedCards });
        setUsageBounds(
          maxWidth > 0 && maxHeight > 0 ? { width: maxWidth, height: maxHeight } : null,
        );
      } catch {
        if (!cancelled) {
          setUsage({ total: 0, cards: [] });
          setUsageBounds(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  useEffect(() => {
    setPendingOpenCard(null);
    setIsSavePromptOpen(false);
  }, [asset.id]);

  useEffect(() => {
    setIsPreviewModalOpen(false);
  }, [asset.id]);

  useEffect(() => {
    return () => {
      if (recenterTimeoutRef.current) {
        window.clearTimeout(recenterTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showCarousel) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onSelectIndex((safeIndex - 1 + assets.length) % assets.length);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onSelectIndex((safeIndex + 1) % assets.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [assets.length, onSelectIndex, safeIndex, showCarousel]);

  return (
    <aside className={`${styles.rightPanel} ${styles.assetsRightPanel}`}>
      <div className={styles.assetsInspectorBody}>
        <AssetsInspectorActions
          asset={asset}
          assetBlob={assetBlob}
          assetSizeBytes={assetSizeBytes}
          previewUrl={previewUrl}
          isOpaquePng={isOpaquePng}
          assetCount={assets.length}
          usageBounds={usageBounds}
          onReplaceComplete={onReplaceComplete}
          onOptimizeComplete={onOptimizeComplete}
          enqueueAssetReplacement={(
            assetId: string,
            dimensions: { width: number; height: number },
          ) => enqueueAsset(assetId, dimensions)}
          onAssetBinaryUpdated={({ blob, sizeBytes }) => {
            setAssetBlob(blob);
            setAssetSizeBytes(sizeBytes);
          }}
        />
        <AssetsInspectorHero
          assetsCount={assets.length}
          safeIndex={safeIndex}
          assetName={asset.name}
          previewUrl={previewUrl}
          isPreviewLoading={isPreviewLoading}
          showCarousel={showCarousel}
          onPrevious={() => onSelectIndex((safeIndex - 1 + assets.length) % assets.length)}
          onNext={() => onSelectIndex((safeIndex + 1) % assets.length)}
          onOpenPreview={() => setIsPreviewModalOpen(true)}
        />
        <AssetsInspectorDetails
          asset={asset}
          assetSizeBytes={assetSizeBytes}
          usage={usage}
          onOpenCard={(cardId) => void requestOpenCard(cardId)}
        />
      </div>
      <ConfirmModal
        isOpen={isSavePromptOpen}
        title={t("heading.saveBeforeView")}
        confirmLabel={t("actions.save")}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          setIsSavePromptOpen(false);
          const nextOpenCard = pendingOpenCard;
          setPendingOpenCard(null);
          const saved = await saveCurrentCard();
          if (!saved) return;
          if (nextOpenCard) {
            await openCard(nextOpenCard.id);
          }
        }}
        onCancel={() => {
          setIsSavePromptOpen(false);
          setPendingOpenCard(null);
        }}
      >
        {t("confirm.saveBeforeViewBody")}
      </ConfirmModal>
      <AssetsPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        previewUrl={previewUrl}
        isLoading={isPreviewLoading}
        assetName={asset.name}
      />
    </aside>
  );
}
