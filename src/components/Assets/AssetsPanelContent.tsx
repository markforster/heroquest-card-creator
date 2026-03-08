"use client";

import { Search, Trash2, Upload } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import getImageDimensions from "@/components/Assets/getImageDimensions";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useMissingAssets } from "@/components/Providers/MissingAssetsContext";
import IconButton from "@/components/common/IconButton";
import { WarningNotice } from "@/components/common/Notice";
import {
  ENABLE_MISSING_ASSET_CHECKS,
  ENABLE_MISSING_ASSET_DELETE_SCAN,
} from "@/config/flags";
import ModalShell from "@/components/common/ModalShell";
import UploadProgressOverlay from "@/components/Assets/UploadProgressOverlay";
import { useI18n } from "@/i18n/I18nProvider";
import { useAssetHashIndex } from "@/hooks/useAssetHashIndex";
import { useAssetKindQueue } from "@/components/Providers/AssetKindBackfillProvider";
import { generateId } from "@/lib";
import { getNextAvailableFilename } from "@/lib/asset-filename";
import { hashArrayBufferSha256 } from "@/lib/asset-hash";
import { ENABLE_ASSET_THUMB_THROTTLE } from "@/config/flags";
import { isSafariBrowser } from "@/lib/browser";
import type { AssetKindGroupId } from "@/lib/assets-grouping";
import { groupAssetsByKind } from "@/lib/assets-grouping";
import type { AssetRecord } from "@/lib/assets-db";
import {
  addAsset,
  deleteAssets,
  getAllAssets,
  getAssetObjectUrl,
  updateAssetMeta,
} from "@/lib/assets-db";
import { listCards, updateCard } from "@/lib/cards-db";
import type { CardRecord } from "@/types/cards-db";
import type { UploadScanReportItem } from "@/types/asset-duplicates";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import type { Dispatch, SetStateAction } from "react";
import type { OpenCloseProps } from "@/types/ui";

type AssetsPanelMode = "manage" | "select";

type AssetsPanelProps = OpenCloseProps & {
  mode?: AssetsPanelMode;
  onSelect?: (asset: AssetRecord) => void;
  onSelectionChange?: (assets: AssetRecord[]) => void;
  refreshKey?: number;
  preferredKindOrder?: AssetKindGroupId[];
};

type ConfirmState = {
  assetIds: string[];
  isDeleting: boolean;
};

type UploadNotice = {
  duplicates: UploadScanReportItem[];
  renames: Array<{ original: string; renamed: string }>;
};

type UploadProgressPhase =
  | "scanning"
  | "review"
  | "processing"
  | "saving"
  | "refreshing"
  | "cancelled"
  | "done";

type UploadProgressState = {
  phase: UploadProgressPhase;
  total: number;
  completed: number;
  currentFileName: string | null;
  isIndeterminate: boolean;
  skippedCount: number;
  errorCount: number;
  renamedCount: number;
  uploadedCount: number;
  duplicateCount: number;
};

const ENABLE_UPLOAD_PROGRESS = true;
const ENABLE_UPLOAD_DEBUG_DELAY = true;
const UPLOAD_DEBUG_DELAY_MS = 1;

async function maybeDelayUploadStep(): Promise<void> {
  if (!ENABLE_UPLOAD_DEBUG_DELAY) return;
  await new Promise((resolve) => setTimeout(resolve, UPLOAD_DEBUG_DELAY_MS));
}

export default function AssetsPanelContent({
  isOpen,
  onClose,
  mode = "manage",
  onSelect,
  onSelectionChange,
  refreshKey,
  preferredKindOrder,
}: AssetsPanelProps) {
  const { t } = useI18n();
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [search, setSearch] = useState("");
  const [assetKindFilter, setAssetKindFilter] = useState<
    "all" | "artwork" | "icon" | "unclassified"
  >("all");
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const thumbUrlsRef = useRef<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [uploadNotice, setUploadNotice] = useState<UploadNotice | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const [uploadReview, setUploadReview] = useState<UploadNotice | null>(null);
  const reviewResolverRef = useRef<((shouldContinue: boolean) => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isKindFilterOpen, setIsKindFilterOpen] = useState(false);
  const kindFilterRef = useRef<HTMLDivElement | null>(null);
  const [activeKindPopoverId, setActiveKindPopoverId] = useState<string | null>(null);
  const [kindPopoverStyle, setKindPopoverStyle] = useState<React.CSSProperties | null>(null);
  const kindPopoverRef = useRef<HTMLDivElement | null>(null);
  const kindAnchorRef = useRef<HTMLElement | null>(null);
  const { scanFiles, addToIndex, removeFromIndex, existingNames } = useAssetHashIndex();
  const { runMissingAssetsScan } = useMissingAssets();
  const { enqueueAsset, cancelAsset, setIsActive } = useAssetKindQueue();
  const isSafari = typeof window !== "undefined" ? isSafariBrowser() : false;

  useEffect(() => {
    if (!isOpen) {
      setIsActive(false);
      return;
    }
    setIsActive(true);
    return () => {
      setIsActive(false);
    };
  }, [isOpen, setIsActive]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    getAllAssets()
      .then((records) => {
        if (!cancelled) {
          setAssets(records);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssets([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, refreshKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isOpen) return;
    let timeoutId: number | null = null;
    const handleUpdate = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        getAllAssets()
          .then((records) => setAssets(records))
          .catch(() => {
            // Ignore refresh errors.
          });
      }, 250);
    };
    window.addEventListener("hqcc-assets-updated", handleUpdate);
    return () => {
      window.removeEventListener("hqcc-assets-updated", handleUpdate);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isKindFilterOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!kindFilterRef.current) return;
      if (!kindFilterRef.current.contains(event.target as Node)) {
        setIsKindFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isKindFilterOpen]);

  useEffect(() => {
    if (!activeKindPopoverId) return;
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (kindPopoverRef.current?.contains(target)) return;
      if (kindAnchorRef.current?.contains(target)) return;
      setActiveKindPopoverId(null);
    };
    window.addEventListener("mousedown", handlePointer);
    return () => window.removeEventListener("mousedown", handlePointer);
  }, [activeKindPopoverId]);

  useLayoutEffect(() => {
    if (!activeKindPopoverId) return;
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
      let top = anchorRect.bottom + offset;
      left = Math.min(Math.max(left, padding), viewportWidth - popoverRect.width - padding);
      if (top + popoverRect.height + padding > viewportHeight) {
        top = anchorRect.top - popoverRect.height - offset;
      }
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
  }, [activeKindPopoverId]);

  useEffect(() => {
    if (!isOpen) {
      Object.values(thumbUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
      thumbUrlsRef.current = {};
      setThumbUrls({});
      return;
    }
    if (assets.length === 0) {
      Object.values(thumbUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
      thumbUrlsRef.current = {};
      setThumbUrls({});
      return;
    }

    let cancelled = false;
    const assetIds = new Set(assets.map((asset) => asset.id));
    const nextUrls: Record<string, string> = { ...thumbUrlsRef.current };
    let urlsChanged = false;

    Object.keys(nextUrls).forEach((id) => {
      if (!assetIds.has(id)) {
        URL.revokeObjectURL(nextUrls[id]);
        delete nextUrls[id];
        urlsChanged = true;
      }
    });

    (async () => {
      const pending = assets.filter((asset) => !nextUrls[asset.id]);
      if (pending.length === 0 && !urlsChanged) return;
      const concurrency = ENABLE_ASSET_THUMB_THROTTLE ? 3 : 10;
      let cursor = 0;
      const idleCallback = (window as Window & typeof globalThis).requestIdleCallback;
      const maybeYield = async (): Promise<void> =>
        new Promise<void>((resolve) => {
          if (!ENABLE_ASSET_THUMB_THROTTLE) {
            resolve();
            return;
          }
          if (typeof idleCallback === "function") {
            idleCallback(() => resolve(), { timeout: 150 });
          } else {
            window.setTimeout(resolve, 50);
          }
        });

      const runWorker = async (): Promise<void> => {
        while (true) {
          if (cancelled) return;
          const index = cursor;
          cursor += 1;
          if (index >= pending.length) return;
          const asset = pending[index];
          if (!asset || nextUrls[asset.id]) {
            continue;
          }
          try {
            const url = await getAssetObjectUrl(asset.id);
            if (url) {
              nextUrls[asset.id] = url;
              urlsChanged = true;
            }
          } catch {
            // Ignore individual asset errors for now.
          }
          await maybeYield();
        }
      };

      const workers = Array.from({ length: Math.min(concurrency, pending.length) }, () =>
        runWorker(),
      );
      await Promise.all(workers);

      if (!cancelled && urlsChanged) {
        thumbUrlsRef.current = nextUrls;
        setThumbUrls(nextUrls);
      } else if (cancelled) {
        Object.values(nextUrls).forEach((url) => URL.revokeObjectURL(url));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, assets, refreshKey]);

  useEffect(() => {
    if (!isOpen && selectedIds.size > 0) {
      setSelectedIds(new Set());
      setSelectedOrder([]);
    }
  }, [isOpen, selectedIds]);

  useEffect(() => {
    if (selectedOrder.length === 0) return;
    const idSet = new Set(assets.map((asset) => asset.id));
    const nextOrder = selectedOrder.filter((id) => idSet.has(id));
    const isSameLength = nextOrder.length === selectedOrder.length;
    const isSameOrder =
      isSameLength && nextOrder.every((id, index) => id === selectedOrder[index]);
    if (isSameOrder) return;
    setSelectedOrder(nextOrder);
    setSelectedIds(new Set(nextOrder));
  }, [assets, selectedOrder]);

  useEffect(() => {
    if (!confirmState || confirmState.isDeleting) return;

    const nextIds = Array.from(selectedIds);
    if (nextIds.length === 0) {
      setConfirmState(null);
      return;
    }

    setConfirmState((prev) => {
      if (!prev || prev.isDeleting) return prev;
      if (prev.assetIds.length === nextIds.length) {
        const prevSet = new Set(prev.assetIds);
        const isSame = nextIds.every((id) => prevSet.has(id));
        if (isSame) return prev;
      }
      return { ...prev, assetIds: nextIds };
    });
  }, [confirmState, selectedIds, setConfirmState]);

  useEffect(() => {
    if (!onSelectionChange) return;
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    const selectedAssets = selectedOrder
      .map((id) => assetById.get(id))
      .filter((asset): asset is AssetRecord => Boolean(asset));
    onSelectionChange(selectedAssets);
  }, [assets, onSelectionChange, selectedOrder]);

  const searchFiltered = search
    ? assets.filter((asset) => asset.name.toLowerCase().includes(search.toLowerCase()))
    : assets;

  const filteredAssets = searchFiltered.filter((asset) => {
    if (assetKindFilter === "all") return true;
    if (assetKindFilter === "artwork") {
      return asset.assetKindStatus === "classified" && asset.assetKind === "artwork";
    }
    if (assetKindFilter === "icon") {
      return asset.assetKindStatus === "classified" && asset.assetKind === "icon";
    }
    return asset.assetKindStatus !== "classified";
  });

  const groupedAssets = groupAssetsByKind(filteredAssets, preferredKindOrder).filter(
    (group) => group.assets.length > 0,
  );

  const totalCount = assets.length;
  const artworkCount = assets.filter(
    (asset) => asset.assetKindStatus === "classified" && asset.assetKind === "artwork",
  ).length;
  const iconCount = assets.filter(
    (asset) => asset.assetKindStatus === "classified" && asset.assetKind === "icon",
  ).length;
  const unclassifiedCount = assets.filter((asset) => asset.assetKindStatus !== "classified").length;

  const assetKindFilterLabel =
    assetKindFilter === "all"
      ? t("label.assetKindFilterAll")
      : assetKindFilter === "artwork"
        ? t("label.assetKindFilterArtwork")
        : assetKindFilter === "icon"
          ? t("label.assetKindFilterIcon")
          : t("label.assetKindFilterUnclassified");

  const handleConfirmDelete = async (ids: string[]) => {
    try {
      await deleteAssets(ids);
      removeFromIndex(ids);
      const records = await getAllAssets();
      setAssets(records);

      const idSet = new Set(ids);
      const cards = await listCards();
      await Promise.all(
        cards.map(async (card) => {
          const imageMatch = card.imageAssetId && idSet.has(card.imageAssetId);
          const iconMatch = card.monsterIconAssetId && idSet.has(card.monsterIconAssetId);
          if (!imageMatch && !iconMatch) return;

          const patch: Partial<CardRecord> = {};
          if (imageMatch) {
            patch.imageAssetId = undefined;
            patch.imageAssetName = undefined;
            patch.imageScale = undefined;
            patch.imageScaleMode = undefined;
            patch.imageOriginalWidth = undefined;
            patch.imageOriginalHeight = undefined;
            patch.imageOffsetX = undefined;
            patch.imageOffsetY = undefined;
            patch.imageRotation = undefined;
          }
          if (iconMatch) {
            patch.monsterIconAssetId = undefined;
            patch.monsterIconAssetName = undefined;
            patch.monsterIconOffsetX = undefined;
            patch.monsterIconOffsetY = undefined;
            patch.monsterIconScale = undefined;
            patch.monsterIconRotation = undefined;
          }

          await updateCard(card.id, patch);
        }),
      );
      if (ENABLE_MISSING_ASSET_CHECKS && ENABLE_MISSING_ASSET_DELETE_SCAN) {
        runMissingAssetsScan("assets-deleted");
      }
    } catch {
      // eslint-disable-next-line no-console
      console.error("[AssetsModal] Failed to delete assets");
    }
  };

  const handleUpload = async (files: File[], input: HTMLInputElement) => {
    if (files.length === 0) return;
    let completedCount = 0;
    let keepProgressOpen = false;

    try {
      setUploadNotice(null);
      setUploadReview(null);
      if (ENABLE_UPLOAD_PROGRESS) {
        setUploadProgress({
          phase: "scanning",
          total: files.length,
          completed: 0,
          currentFileName: null,
          isIndeterminate: true,
          skippedCount: 0,
          errorCount: 0,
          renamedCount: 0,
          uploadedCount: 0,
          duplicateCount: 0,
        });
      }
      let scanByIndex: Map<number, string | null> | null = null;
      let reportByIndex: Map<
        number,
        "unique" | "duplicate-existing" | "duplicate-batch" | "name-collision" | "error"
      > | null = null;

      try {
        const scanResult = await scanFiles(
          files,
          async (completed, total) => {
            if (!ENABLE_UPLOAD_PROGRESS) return;
            setUploadProgress((prev) =>
              prev
                ? {
                    ...prev,
                    phase: "scanning",
                    completed,
                    total,
                    isIndeterminate: false,
                  }
                : prev,
            );
            await maybeDelayUploadStep();
          },
        );
        scanByIndex = new Map(scanResult.items.map((item) => [item.fileIndex, item.hash]));
        reportByIndex = new Map(scanResult.items.map((item) => [item.fileIndex, item.status]));
      } catch (scanError) {
        // eslint-disable-next-line no-console
        console.warn("[AssetsModal] Upload scan failed", scanError);
      }

      if (ENABLE_UPLOAD_PROGRESS) {
        setUploadProgress((prev) =>
          prev
            ? {
                ...prev,
                phase: "processing",
                completed: 0,
                isIndeterminate: true,
              }
            : prev,
        );
      }

      const duplicates: UploadScanReportItem[] = [];
      const renames: Array<{ original: string; renamed: string }> = [];
      const uploaded = new Set<string>();
      const existingNamesLower = new Set(
        Array.from(existingNames, (name) => name.toLowerCase()),
      );
      const existingFileNames = new Set(existingNames);
      const colliding = new Set<string>();
      const batchHashes = new Set<string>();
      const batchNames = new Set<string>();
      const batchNamesLower = new Set<string>();
      let skippedCount = 0;
      let errorCount = 0;

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        if (!file) continue;
        const name = file.name;
        const nameLower = name.toLowerCase();
        if (!file.type.startsWith("image/")) {
          // eslint-disable-next-line no-console
          console.warn("[AssetsModal] Unsupported file type", file.type);
          skippedCount += 1;
          continue;
        }

        let fileHash: string | null = null;

        if (scanByIndex && reportByIndex) {
          fileHash = scanByIndex.get(index) ?? null;
          const report = reportByIndex.get(index);
          if (report === "duplicate-existing") {
            duplicates.push({
              file,
              status: "duplicate-existing",
              fileIndex: index,
              hash: fileHash,
              recommendedAction: "skip",
            });
            skippedCount += 1;
            continue;
          }
          if (report === "duplicate-batch") {
            duplicates.push({
              file,
              status: "duplicate-batch",
              fileIndex: index,
              hash: fileHash,
              recommendedAction: "skip",
            });
            skippedCount += 1;
            continue;
          }
          if (report === "name-collision") {
            colliding.add(nameLower);
          }
          if (report === "error") {
            skippedCount += 1;
            continue;
          }
        }

        if (!fileHash) {
          try {
            const buffer = await file.arrayBuffer();
            fileHash = await hashArrayBufferSha256(buffer);
          } catch (hashError) {
            // eslint-disable-next-line no-console
            console.warn("[AssetsModal] Failed to hash uploaded file", hashError);
          }
        }

        if (fileHash) {
          if (batchHashes.has(fileHash)) {
            duplicates.push({
              file,
              status: "duplicate-batch",
              fileIndex: index,
              hash: fileHash,
              recommendedAction: "skip",
            });
            skippedCount += 1;
            continue;
          }
          batchHashes.add(fileHash);
        }

        let nextName = name;
        let isRename = false;
        if (
          existingNamesLower.has(nameLower) ||
          batchNamesLower.has(nameLower) ||
          colliding.has(nameLower)
        ) {
          nextName = getNextAvailableFilename(
            new Set([...existingFileNames, ...batchNames]),
            name,
          );
          isRename = true;
          renames.push({ original: name, renamed: nextName });
        }

        try {
          let dimensions = { width: 0, height: 0 };
          try {
            dimensions = await getImageDimensions(file);
          } catch {
            // Ignore dimension read errors; fall back to 0.
          }
          const assetId = generateId();
          await addAsset(assetId, file, {
            name: nextName,
            mimeType: file.type,
            width: dimensions.width,
            height: dimensions.height,
          });
          await updateAssetMeta(assetId, {
            assetKindStatus: "unclassified",
            assetKindUpdatedAt: Date.now(),
          });
          enqueueAsset(assetId, { width: dimensions.width, height: dimensions.height });
          uploaded.add(assetId);
          existingNamesLower.add(nextName.toLowerCase());
          existingFileNames.add(nextName);
          batchNamesLower.add(nextName.toLowerCase());
          batchNames.add(nextName);
          if (fileHash) {
            addToIndex(fileHash, {
              id: assetId,
              name: nextName,
              mimeType: file.type,
              width: dimensions.width,
              height: dimensions.height,
              createdAt: Date.now(),
              size: file.size,
            });
          }
        } catch (fileError) {
          // eslint-disable-next-line no-console
          console.error("[AssetsModal] Upload failed for file", file.name, fileError);
          errorCount += 1;
        }

        completedCount += 1;

        if (ENABLE_UPLOAD_PROGRESS) {
          setUploadProgress((prev) =>
            prev
              ? {
                  ...prev,
                  phase: "processing",
                  completed: completedCount,
                  total: files.length,
                  currentFileName: file.name,
                  isIndeterminate: false,
                  skippedCount,
                  errorCount,
                  renamedCount: renames.length,
                  uploadedCount: uploaded.size,
                  duplicateCount: duplicates.length,
                }
              : prev,
          );
        }
      }

      if (duplicates.length > 0 || renames.length > 0) {
        if (ENABLE_UPLOAD_PROGRESS) {
          setUploadProgress((prev) =>
            prev
              ? {
                  ...prev,
                  phase: "review",
                  completed: completedCount,
                  total: files.length,
                  currentFileName: null,
                  isIndeterminate: false,
                  skippedCount,
                  errorCount,
                  renamedCount: renames.length,
                  uploadedCount: uploaded.size,
                  duplicateCount: duplicates.length,
                }
              : prev,
          );
          const continueUpload = await new Promise<boolean>((resolve) => {
            reviewResolverRef.current = resolve;
            setUploadReview({ duplicates, renames });
          });
          if (!continueUpload) {
            keepProgressOpen = true;
            return;
          }
        } else {
          setUploadNotice({ duplicates, renames });
        }
      }

      if (ENABLE_UPLOAD_PROGRESS) {
        setUploadProgress((prev) =>
          prev
            ? {
                ...prev,
                phase: "refreshing",
                completed: completedCount,
                total: files.length,
                currentFileName: null,
                isIndeterminate: false,
                skippedCount,
                errorCount,
                renamedCount: renames.length,
                uploadedCount: uploaded.size,
                duplicateCount: duplicates.length,
              }
            : prev,
        );
      }

      try {
        const records = await getAllAssets();
        setAssets(records);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[AssetsModal] Upload failed", error);
      }

      if (ENABLE_UPLOAD_PROGRESS) {
        setUploadProgress((prev) =>
          prev
            ? {
                ...prev,
                phase: "done",
                completed: completedCount,
                total: files.length,
                currentFileName: null,
                isIndeterminate: false,
                skippedCount,
                errorCount,
                renamedCount: renames.length,
                uploadedCount: uploaded.size,
                duplicateCount: duplicates.length,
              }
            : prev,
        );
      }
    } finally {
      if (!keepProgressOpen && ENABLE_UPLOAD_PROGRESS) {
        setUploadProgress(null);
      }
      setUploadReview(null);
      reviewResolverRef.current = null;
      input.value = "";
    }
  };

  const handleUploadReviewContinue = () => {
    reviewResolverRef.current?.(true);
    reviewResolverRef.current = null;
  };

  const handleUploadReviewCancel = () => {
    reviewResolverRef.current?.(false);
    reviewResolverRef.current = null;
    setUploadReview(null);
  };

  const handleUploadSummaryClose = () => {
    setUploadProgress(null);
  };

  const activeKindAsset = activeKindPopoverId
    ? assets.find((asset) => asset.id === activeKindPopoverId) ?? null
    : null;
  const isKindPopoverOpen = Boolean(activeKindAsset);
  const kindStatus = activeKindAsset?.assetKindStatus ?? "unclassified";
  const canOverrideKind = kindStatus !== "classifying";
  const applyManualKind = async (kind: "icon" | "artwork") => {
    if (!activeKindAsset) return;
    cancelAsset(activeKindAsset.id);
    await updateAssetMeta(activeKindAsset.id, {
      assetKindStatus: "classified",
      assetKind: kind,
      assetKindSource: "manual",
      assetKindConfidence: 1,
      assetKindUpdatedAt: Date.now(),
    });
    setActiveKindPopoverId(null);
  };

  return (
    <div className={`${styles.assetsPanel} d-flex flex-column flex-grow-1`}>
      {isSafari ? (
        <WarningNotice className="mb-2" role="status">
          {t("warning.safariAutoclassifyUnsupported")}
        </WarningNotice>
      ) : null}
      <div className={`${styles.assetsToolbar} d-flex align-items-center gap-2 px-2 py-2`}>
        <div className="input-group input-group-sm" style={{ maxWidth: 260 }}>
          <span className={`input-group-text ${styles.themedInputGroupText}`}>
            <Search className={styles.icon} aria-hidden="true" />
          </span>
          <input
            type="search"
            placeholder={t("placeholders.searchAssets")}
            className={`form-control form-control-sm ${styles.assetsSearch} ${styles.themedFormControl}`}
            title={t("tooltip.searchAssets")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className={styles.cardsFilterMenu} ref={kindFilterRef}>
            <button
              type="button"
              className={styles.cardsFilterButton}
              title={t("tooltip.filterAssets")}
              aria-expanded={isKindFilterOpen}
              onClick={() => setIsKindFilterOpen((prev) => !prev)}
            >
              <span>{assetKindFilterLabel}</span>
            </button>
            {isKindFilterOpen ? (
              <div className={styles.cardsFilterPopover} role="menu">
                <button
                  type="button"
                  className={`${styles.cardsFilterItem} ${
                    assetKindFilter === "all" ? styles.cardsFilterItemActive : ""
                  }`}
                  role="menuitem"
                  onClick={() => {
                    setAssetKindFilter("all");
                    setIsKindFilterOpen(false);
                  }}
                >
                  <span>{t("label.assetKindFilterAll")}</span>
                  <span className={styles.cardsFilterCount}>{totalCount}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.cardsFilterItem} ${
                    assetKindFilter === "artwork" ? styles.cardsFilterItemActive : ""
                  }`}
                  role="menuitem"
                  onClick={() => {
                    setAssetKindFilter("artwork");
                    setIsKindFilterOpen(false);
                  }}
                >
                  <span>{t("label.assetKindFilterArtwork")}</span>
                  <span className={styles.cardsFilterCount}>{artworkCount}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.cardsFilterItem} ${
                    assetKindFilter === "icon" ? styles.cardsFilterItemActive : ""
                  }`}
                  role="menuitem"
                  onClick={() => {
                    setAssetKindFilter("icon");
                    setIsKindFilterOpen(false);
                  }}
                >
                  <span>{t("label.assetKindFilterIcon")}</span>
                  <span className={styles.cardsFilterCount}>{iconCount}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.cardsFilterItem} ${
                    assetKindFilter === "unclassified" ? styles.cardsFilterItemActive : ""
                  }`}
                  role="menuitem"
                  onClick={() => {
                    setAssetKindFilter("unclassified");
                    setIsKindFilterOpen(false);
                  }}
                >
                  <span>{t("label.assetKindFilterUnclassified")}</span>
                  <span className={styles.cardsFilterCount}>{unclassifiedCount}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className={styles.assetsToolbarSpacer} />
        <div className={`${styles.assetsActions} d-flex align-items-center gap-2`}>
          <IconButton
            className="btn btn-primary btn-sm"
            icon={Upload}
            onClick={() => {
              fileInputRef.current?.click();
            }}
            title={t("tooltip.uploadImages")}
          >
            {t("actions.upload")}
          </IconButton>
          {mode === "manage" && (
            <IconButton
              className="btn btn-outline-danger btn-sm"
              icon={Trash2}
              disabled={selectedIds.size === 0}
              onClick={() => {
                if (selectedIds.size === 0) return;
                const ids = Array.from(selectedIds);
                setConfirmState({
                  assetIds: ids,
                  isDeleting: false,
                });
              }}
              title={t("tooltip.deleteAssets")}
            >
              {t("actions.delete")}
              {selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}
            </IconButton>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={async (event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length === 0) return;
              await handleUpload(files, event.target);
            }}
          />
        </div>
      </div>
      <div className={`${styles.assetsGridContainer} flex-grow-1 overflow-auto`}>
        {filteredAssets.length === 0 ? (
          <div className={styles.assetsEmptyState}>{t("empty.noAssets")}</div>
        ) : (
          <div className={styles.assetsGroups}>
            {groupedAssets.map((group) => (
              <section key={group.id} className={styles.assetsGroup}>
                <h3 className={styles.assetsGroupTitle}>{t(group.labelKey)}</h3>
                <div className={styles.assetsGroupGrid}>
                  {group.assets.map((asset) => {
                    const isSelected = selectedIds.has(asset.id);
                    const kindStatus = asset.assetKindStatus ?? "unclassified";
                    const kindLabel =
                      kindStatus === "classifying"
                        ? t("label.assetKindClassifying")
                        : kindStatus === "classified"
                          ? asset.assetKind === "icon"
                            ? t("label.assetKindIcon")
                            : t("label.assetKindArtwork")
                          : t("label.assetKindUnknown");
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        className={`${styles.assetsItem} ${
                          isSelected ? styles.assetsItemSelected : ""
                        }`}
                        title={asset.name}
                        onClick={(event) => {
                          setSelectedIds((prev) => {
                            if (mode === "select") {
                              setSelectedOrder([asset.id]);
                              return new Set([asset.id]);
                            }
                            const hasModifier = event.metaKey || event.ctrlKey;
                            if (hasModifier) {
                              const next = new Set(prev);
                              if (next.has(asset.id)) {
                                next.delete(asset.id);
                                setSelectedOrder((order) =>
                                  order.filter((id) => id !== asset.id),
                                );
                              } else {
                                next.add(asset.id);
                                setSelectedOrder((order) => [
                                  asset.id,
                                  ...order.filter((id) => id !== asset.id),
                                ]);
                              }
                              return next;
                            }
                            if (prev.size === 1 && prev.has(asset.id)) {
                              setSelectedOrder([]);
                              return new Set();
                            }
                            setSelectedOrder([asset.id]);
                            return new Set([asset.id]);
                          });
                        }}
                        onDoubleClick={() => {
                          if (mode !== "select" || !onSelect) return;
                          onSelect(asset);
                          onClose();
                        }}
                      >
                        <span
                          className={`${styles.assetsKindBadge} ${styles.assetsKindBadgeOverlay} ${styles.assetsKindBadgeClickable} ${
                            kindStatus === "classifying"
                              ? styles.assetsKindBadgeClassifying
                              : kindStatus === "classified"
                                ? asset.assetKind === "icon"
                                  ? styles.assetsKindBadgeIcon
                                  : styles.assetsKindBadgeArtwork
                                : styles.assetsKindBadgeUnknown
                          }`}
                          role="button"
                          tabIndex={0}
                          aria-haspopup="dialog"
                          aria-expanded={activeKindPopoverId === asset.id}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            if (kindStatus === "classifying") return;
                            kindAnchorRef.current = event.currentTarget;
                            setActiveKindPopoverId(asset.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            if (kindStatus === "classifying") return;
                            kindAnchorRef.current = event.currentTarget;
                            setActiveKindPopoverId(asset.id);
                          }}
                        >
                          {kindLabel}
                        </span>
                        <div className={styles.assetsThumbPlaceholder}>
                          {thumbUrls[asset.id] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumbUrls[asset.id]}
                              alt={asset.name}
                              className={styles.assetsThumbImage}
                            />
                          ) : null}
                        </div>
                        <div className={styles.assetsItemMeta}>
                          <div className={styles.assetsItemName} title={asset.name}>
                            {asset.name}
                          </div>
                          <div className={styles.assetsItemDetails}>
                            {asset.width}×{asset.height} · {asset.mimeType}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      {(mode === "select" || confirmState) && (
        <div className={styles.assetsFooter}>
          <AssetsModalFooter
            mode={mode}
            selectedIds={selectedIds}
            onClose={onClose}
            onSelect={onSelect}
            assets={filteredAssets}
            onConfirmDelete={handleConfirmDelete}
            confirmState={confirmState}
            setConfirmState={setConfirmState}
          />
        </div>
      )}
      {isKindPopoverOpen
        ? createPortal(
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
                disabled={!canOverrideKind}
              >
                {t("label.assetKindIcon")}
              </button>
              <button
                type="button"
                className={styles.assetsKindPopoverOption}
                onClick={() => void applyManualKind("artwork")}
                disabled={!canOverrideKind}
              >
                {t("label.assetKindArtwork")}
              </button>
              {!canOverrideKind ? (
                <div className={styles.assetsKindPopoverHint}>
                  {t("label.assetKindClassifyingHint")}
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
      {!ENABLE_UPLOAD_PROGRESS ? (
        <ModalShell
          isOpen={Boolean(
            uploadNotice && (uploadNotice.duplicates.length > 0 || uploadNotice.renames.length > 0),
          )}
          onClose={() => setUploadNotice(null)}
          title={t("heading.uploadReview")}
          footer={
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setUploadNotice(null)}
            >
              {t("actions.ok")}
            </button>
          }
          contentClassName={styles.assetsReportPopover}
        >
          {uploadNotice ? (
            <div>
              {uploadNotice.duplicates.length > 0 ? (
                <>
                  <div className={styles.assetsReportIntro}>
                    {uploadNotice.duplicates.length}{" "}
                    {uploadNotice.duplicates.length === 1 ? t("label.file") : t("label.files")}{" "}
                    {t("status.filesWereSkipped")}
                  </div>
                  <div className={`${styles.assetsReportList} d-flex flex-column gap-2`}>
                    {uploadNotice.duplicates.map((item) => (
                      <div
                        key={`${item.fileIndex}-${item.file.name}`}
                        className={styles.assetsReportItem}
                      >
                        <div className={styles.assetsReportName}>{item.file.name}</div>
                        <div className={styles.assetsReportStatus}>
                          {item.status === "duplicate-existing"
                            ? t("status.alreadyInLibrary")
                            : t("status.duplicateInBatch")}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              {uploadNotice.renames.length > 0 ? (
                <>
                  <div className={styles.assetsReportIntro}>
                    {uploadNotice.renames.length}{" "}
                    {uploadNotice.renames.length === 1 ? t("label.file") : t("label.files")}{" "}
                    {t("status.filesWereRenamed")}
                  </div>
                  <div className={`${styles.assetsReportList} d-flex flex-column gap-2`}>
                    {uploadNotice.renames.map((item) => (
                      <div
                        key={`${item.original}-${item.renamed}`}
                        className={styles.assetsReportItem}
                      >
                        <div className={styles.assetsReportName}>{item.original}</div>
                        <div className={styles.assetsReportRename}>{item.renamed}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </ModalShell>
      ) : null}
      <UploadProgressOverlay
        isOpen={Boolean(ENABLE_UPLOAD_PROGRESS && uploadProgress)}
        phaseLabel={
          uploadProgress?.phase === "scanning"
            ? t("status.scanning")
            : uploadProgress?.phase === "processing"
              ? t("status.processing")
              : uploadProgress?.phase === "saving"
                ? t("status.saving")
                : uploadProgress?.phase === "refreshing"
                  ? t("status.refreshing")
                  : uploadProgress?.phase === "review"
                    ? t("status.review")
                    : uploadProgress?.phase === "cancelled"
                      ? t("status.cancelling")
                      : uploadProgress?.phase === "done"
                        ? t("status.uploadComplete")
                        : ""
        }
        currentFileName={uploadProgress?.currentFileName}
        completed={uploadProgress?.completed ?? 0}
        total={uploadProgress?.total ?? 0}
        isIndeterminate={uploadProgress?.isIndeterminate ?? true}
        skippedCount={uploadProgress?.skippedCount ?? 0}
        errorCount={uploadProgress?.errorCount ?? 0}
        renamedCount={uploadProgress?.renamedCount ?? 0}
        uploadedCount={uploadProgress?.uploadedCount ?? 0}
        duplicateCount={uploadProgress?.duplicateCount ?? 0}
        isComplete={uploadProgress?.phase === "done"}
        review={uploadReview}
        onReviewContinue={handleUploadReviewContinue}
        onReviewCancel={handleUploadReviewCancel}
        onClose={handleUploadSummaryClose}
      />
    </div>
  );
}

type AssetsFooterProps = {
  mode: AssetsPanelMode;
  selectedIds: Set<string>;
  onClose: () => void;
  onSelect?: (asset: AssetRecord) => void;
  assets: AssetRecord[];
};

function AssetsModalFooter({
  mode,
  selectedIds,
  onClose,
  onSelect,
  assets,
  onConfirmDelete,
  confirmState,
  setConfirmState,
}: AssetsFooterProps & {
  onConfirmDelete: (ids: string[]) => Promise<void> | void;
  confirmState: ConfirmState | null;
  setConfirmState: Dispatch<SetStateAction<ConfirmState | null>>;
}) {
  const { t } = useI18n();
  const {
    state: { draftTemplateId, draft, activeCardIdByTemplate },
    setCardDraft,
    setSingleDraft,
  } = useCardEditor();
  const [affectedCardCount, setAffectedCardCount] = useState<number | null>(null);

  useEffect(() => {
    if (!confirmState) {
      setAffectedCardCount(null);
      return;
    }

    let cancelled = false;
    const idSet = new Set(confirmState.assetIds);

    (async () => {
      try {
        const cards = await listCards();
        if (cancelled) return;
        const affectedCards = new Set<string>();

        cards.forEach((card) => {
          if (card.imageAssetId && idSet.has(card.imageAssetId)) {
            affectedCards.add(card.id);
            return;
          }
          if (card.monsterIconAssetId && idSet.has(card.monsterIconAssetId)) {
            affectedCards.add(card.id);
          }
        });

        setAffectedCardCount(affectedCards.size);
      } catch {
        if (!cancelled) {
          setAffectedCardCount(0);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [confirmState]);

  if (mode === "select") {
    const firstId = selectedIds.values().next().value as string | undefined;
    const selectedAsset = firstId ? assets.find((asset) => asset.id === firstId) : undefined;
    return (
      <>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
          {t("actions.cancel")}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!selectedAsset}
          onClick={() => {
            if (!selectedAsset || !onSelect) return;
            onSelect(selectedAsset);
            onClose();
          }}
        >
          {t("actions.select")}
        </button>
      </>
    );
  }

  if (confirmState) {
    const { assetIds, isDeleting } = confirmState;
    const assetCount = assetIds.length;
    const idSet = new Set(assetIds);

    const affectedDrafts = new Set<TemplateId>();
    if (draftTemplateId && draft && !activeCardIdByTemplate[draftTemplateId]) {
      const imageMatch = draft.imageAssetId && idSet.has(draft.imageAssetId);
      const iconMatch = "iconAssetId" in draft && draft.iconAssetId && idSet.has(draft.iconAssetId);
      if (imageMatch || iconMatch) {
        affectedDrafts.add(draftTemplateId);
      }
    }

    const affectedDraftCount = affectedDrafts.size;
    const cardCountLabel = affectedCardCount === 1 ? t("label.card") : t("label.cards");
    const cardCountValue = affectedCardCount ?? "...";
    const draftLabel = affectedDraftCount === 1 ? t("label.draft") : t("label.drafts");

    return (
      <>
        <div className={styles.assetsConfirmMessage}>
          {t("confirm.deleteAssetsBody")} {assetCount}{" "}
          {assetCount === 1 ? t("label.asset") : t("label.assets")} {t("status.willClearImagesOn")}
          {" "}
          {cardCountValue} {cardCountLabel}
          {affectedDraftCount > 0 ? `, ${affectedDraftCount} ${draftLabel}` : ""}.{" "}
          {t("actions.continue")}?
        </div>
        <button
          type="button"
          className={styles.templateSecondaryButton}
          disabled={isDeleting}
          onClick={() => setConfirmState(null)}
        >
          {t("actions.cancel")}
        </button>
        <IconButton
          className="btn btn-danger btn-sm"
          icon={Trash2}
          disabled={isDeleting}
          onClick={async () => {
            const current = confirmState;
            if (!current) return;
            const ids = current.assetIds;
            const idSet = new Set(ids);

            setConfirmState((prev) => (prev ? { ...prev, isDeleting: true } : prev));

            // Clear image fields on any drafts that reference these assets.
            if (draftTemplateId && draft) {
              const imageMatch = draft.imageAssetId && idSet.has(draft.imageAssetId);
              const iconMatch =
                "iconAssetId" in draft && draft.iconAssetId && idSet.has(draft.iconAssetId);

              if (imageMatch || iconMatch) {
                const nextDraft = {
                  ...draft,
                } as CardDataByTemplate[TemplateId];

                if (imageMatch) {
                  nextDraft.imageAssetId = undefined;
                  nextDraft.imageAssetName = undefined;
                  nextDraft.imageScale = undefined;
                  nextDraft.imageScaleMode = undefined;
                  nextDraft.imageOriginalWidth = undefined;
                  nextDraft.imageOriginalHeight = undefined;
                  nextDraft.imageOffsetX = undefined;
                  nextDraft.imageOffsetY = undefined;
                  nextDraft.imageRotation = undefined;
                }

                if (iconMatch && "iconAssetId" in nextDraft) {
                  nextDraft.iconAssetId = undefined;
                  nextDraft.iconAssetName = undefined;
                }

                setCardDraft(draftTemplateId, nextDraft as never);
                setSingleDraft(draftTemplateId, nextDraft as never);
              }
            }

            await onConfirmDelete(ids);
            setConfirmState(null);
          }}
          title={t("tooltip.confirmDeleteAssets")}
        >
          {t("actions.delete")}
        </IconButton>
      </>
    );
  }

  return null;
}
