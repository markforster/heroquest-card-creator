"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { AssetRecord } from "@/api/assets";
import { apiClient } from "@/api/client";
import styles from "@/app/page.module.css";
import { formatAssetDate, formatBytes } from "@/components/Assets/asset-formatters";
import type {
  AssetUsage,
  UsagePopoverAnchor,
} from "@/components/Assets/AssetsRoutePanels.types";
import AssetsUsageCardsPopover from "@/components/Assets/AssetsUsageCardsPopover";
import { usePopoverPlacement } from "@/components/common/usePopoverPlacement";
import { useAssetKindQueue } from "@/components/Providers/AssetKindBackfillProvider";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useI18n } from "@/i18n/I18nProvider";

import type { CSSProperties, FocusEvent } from "react";

type AssetsInspectorDetailsProps = {
  asset: AssetRecord;
  assetSizeBytes: number | null;
  usage: AssetUsage;
  onOpenCard: (cardId: string) => void | Promise<void>;
};

export default function AssetsInspectorDetails({
  asset,
  assetSizeBytes,
  usage,
  onOpenCard,
}: AssetsInspectorDetailsProps) {
  const { t } = useI18n();
  const { cancelAsset } = useAssetKindQueue();
  const [isKindPopoverOpen, setIsKindPopoverOpen] = useState(false);
  const [kindPopoverStyle, setKindPopoverStyle] = useState<CSSProperties | null>(null);
  const [usagePopoverAnchor, setUsagePopoverAnchor] = useState<UsagePopoverAnchor | null>(null);
  const [isUsagePopoverOpen, setIsUsagePopoverOpen] = useState(false);
  const kindAnchorRef = useRef<HTMLButtonElement | null>(null);
  const kindPopoverRef = useRef<HTMLDivElement | null>(null);
  const usageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const usagePopoverRef = useRef<HTMLDivElement | null>(null);
  const usagePopoverCloseTimeoutRef = useRef<number | null>(null);

  const dimensionsLabel = useMemo(() => `${asset.width}×${asset.height}`, [asset.height, asset.width]);
  const sizeLabel = useMemo(
    () => (assetSizeBytes != null ? formatBytes(assetSizeBytes) : "—"),
    [assetSizeBytes],
  );
  const kindStatus = asset.assetKindStatus ?? "unclassified";
  const kindLabel =
    kindStatus === "classifying"
      ? t("label.assetKindClassifying")
      : kindStatus === "classified"
        ? asset.assetKind === "icon"
          ? t("label.assetKindIcon")
          : t("label.assetKindArtwork")
        : t("label.assetKindUnknown");
  const canOverride = kindStatus !== "classifying";

  const kindPopoverPlacement = usePopoverPlacement({
    isOpen: isKindPopoverOpen,
    anchorRef: kindAnchorRef,
    popoverRef: kindPopoverRef,
    offset: 8,
  });

  useOutsideClick(
    [kindPopoverRef, kindAnchorRef],
    () => setIsKindPopoverOpen(false),
    isKindPopoverOpen,
  );

  const clearUsagePopoverCloseTimeout = () => {
    if (usagePopoverCloseTimeoutRef.current) {
      window.clearTimeout(usagePopoverCloseTimeoutRef.current);
      usagePopoverCloseTimeoutRef.current = null;
    }
  };

  const closeUsagePopover = () => {
    clearUsagePopoverCloseTimeout();
    setIsUsagePopoverOpen(false);
    setUsagePopoverAnchor(null);
  };

  const scheduleUsagePopoverClose = () => {
    clearUsagePopoverCloseTimeout();
    usagePopoverCloseTimeoutRef.current = window.setTimeout(() => {
      setIsUsagePopoverOpen(false);
      setUsagePopoverAnchor(null);
    }, 200);
  };

  const openUsagePopover = (anchor: HTMLElement) => {
    if (usage.cards.length === 0) return;
    clearUsagePopoverCloseTimeout();
    const rect = anchor.getBoundingClientRect();
    setUsagePopoverAnchor({
      rect: {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
      },
    });
    setIsUsagePopoverOpen(true);
  };

  const handleUsageTriggerBlur = (event: FocusEvent<HTMLButtonElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (
      (nextTarget && usageTriggerRef.current?.contains(nextTarget)) ||
      (nextTarget && usagePopoverRef.current?.contains(nextTarget))
    ) {
      return;
    }
    closeUsagePopover();
  };

  const handleUsagePopoverBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (
      (nextTarget && usageTriggerRef.current?.contains(nextTarget)) ||
      (nextTarget && usagePopoverRef.current?.contains(nextTarget))
    ) {
      return;
    }
    closeUsagePopover();
  };

  const applyManualKind = async (kind: "icon" | "artwork") => {
    cancelAsset(asset.id);
    await apiClient.updateAssetMetadata(
      {
        patch: {
          assetKindStatus: "classified",
          assetKind: kind,
          assetKindSource: "manual",
          assetKindConfidence: 1,
          assetKindUpdatedAt: Date.now(),
        },
      },
      { params: { id: asset.id } },
    );
    setIsKindPopoverOpen(false);
  };

  useLayoutEffect(() => {
    if (!isKindPopoverOpen) return;
    if (typeof window === "undefined") return;

    const updatePosition = () => {
      const anchor = kindAnchorRef.current;
      const popover = kindPopoverRef.current;
      if (!anchor || !popover) return;

      const anchorRect = anchor.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const padding = 12;
      const offset = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = anchorRect.left;
      let top =
        kindPopoverPlacement === "up"
          ? anchorRect.top - popoverRect.height - offset
          : anchorRect.bottom + offset;

      left = Math.min(Math.max(left, padding), viewportWidth - popoverRect.width - padding);
      top = Math.min(Math.max(top, padding), viewportHeight - popoverRect.height - padding);

      setKindPopoverStyle({ left, top, position: "fixed" });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isKindPopoverOpen, kindPopoverPlacement]);

  useEffect(() => {
    clearUsagePopoverCloseTimeout();
    setIsUsagePopoverOpen(false);
    setUsagePopoverAnchor(null);
    setIsKindPopoverOpen(false);
  }, [asset.id]);

  useEffect(() => {
    return () => {
      clearUsagePopoverCloseTimeout();
    };
  }, []);

  return (
    <>
      <dl className={styles.assetsInspectorDetails}>
        <div className={styles.uRowLg}>
          <dt>{t("label.assetKind")}</dt>
          <dd>
            <div className={styles.assetsKindPopoverAnchor}>
              <button
                type="button"
                ref={kindAnchorRef}
                className={`${styles.assetsKindBadge} ${
                  kindStatus === "classifying"
                    ? styles.assetsKindBadgeClassifying
                    : kindStatus === "classified"
                      ? asset.assetKind === "icon"
                        ? styles.assetsKindBadgeIcon
                        : styles.assetsKindBadgeArtwork
                      : styles.assetsKindBadgeUnknown
                }`}
                onClick={() => {
                  if (!canOverride) return;
                  setIsKindPopoverOpen((prev) => !prev);
                }}
                aria-haspopup="dialog"
                aria-expanded={isKindPopoverOpen}
                disabled={!canOverride}
              >
                {kindLabel}
              </button>
              {isKindPopoverOpen ? (
                <div
                  ref={kindPopoverRef}
                  className={styles.assetsKindPopover}
                  style={
                    kindPopoverStyle ?? {
                      position: "fixed",
                      left: 0,
                      top: 0,
                      opacity: 0,
                      pointerEvents: "none",
                    }
                  }
                  role="dialog"
                >
                  <div className={styles.assetsKindPopoverTitle}>
                    {t("label.assetKindOverride")}
                  </div>
                  <button
                    type="button"
                    className={styles.assetsKindPopoverOption}
                    onClick={() => void applyManualKind("icon")}
                  >
                    {t("label.assetKindIcon")}
                  </button>
                  <button
                    type="button"
                    className={styles.assetsKindPopoverOption}
                    onClick={() => void applyManualKind("artwork")}
                  >
                    {t("label.assetKindArtwork")}
                  </button>
                </div>
              ) : null}
            </div>
            {!canOverride ? (
              <span className={styles.assetsKindPopoverHint}>
                {t("label.assetKindClassifyingHint")}
              </span>
            ) : null}
          </dd>
        </div>
        <div className={styles.uRowLg}>
          <dt>{t("label.fileType")}</dt>
          <dd>{asset.mimeType}</dd>
        </div>
        <div className={styles.uRowLg}>
          <dt>{t("label.dimensions")}</dt>
          <dd>{dimensionsLabel}</dd>
        </div>
        <div className={styles.uRowLg}>
          <dt>{t("label.fileSize")}</dt>
          <dd>{sizeLabel}</dd>
        </div>
        <div className={styles.uRowLg}>
          <dt>{t("label.dateAdded")}</dt>
          <dd>{formatAssetDate(asset.createdAt)}</dd>
        </div>
        <div className={styles.uRowLg}>
          <dt>{t("label.usedOnCards")}</dt>
          <dd>
            {usage.total > 0 ? (
              <button
                ref={usageTriggerRef}
                type="button"
                className={styles.assetsUsageTrigger}
                onMouseEnter={(event) => openUsagePopover(event.currentTarget)}
                onMouseLeave={scheduleUsagePopoverClose}
                onFocus={(event) => openUsagePopover(event.currentTarget)}
                onBlur={handleUsageTriggerBlur}
                aria-haspopup="dialog"
                aria-expanded={isUsagePopoverOpen}
              >
                {usage.total} {usage.total === 1 ? t("label.card") : t("label.cards")}
              </button>
            ) : (
              <>
                {usage.total} {usage.total === 1 ? t("label.card") : t("label.cards")}
              </>
            )}
          </dd>
        </div>
      </dl>
      <AssetsUsageCardsPopover
        isOpen={isUsagePopoverOpen}
        anchor={usagePopoverAnchor}
        cards={usage.cards}
        popoverRef={usagePopoverRef}
        onMouseEnter={clearUsagePopoverCloseTimeout}
        onMouseLeave={scheduleUsagePopoverClose}
        onBlur={handleUsagePopoverBlur}
        onOpenCard={(cardId) => {
          closeUsagePopover();
          void onOpenCard(cardId);
        }}
      />
    </>
  );
}
