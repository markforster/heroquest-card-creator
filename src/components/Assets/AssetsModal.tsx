"use client";

import { Search, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import IconButton from "@/components/IconButton";
import ModalShell from "@/components/ModalShell";
import UploadProgressOverlay from "@/components/Assets/UploadProgressOverlay";
import { useI18n } from "@/i18n/I18nProvider";
import { useAssetHashIndex } from "@/hooks/useAssetHashIndex";
import { generateId } from "@/lib";
import { getNextAvailableFilename } from "@/lib/asset-filename";
import { hashArrayBufferSha256 } from "@/lib/asset-hash";
import type { AssetRecord } from "@/lib/assets-db";
import { addAsset, deleteAssets, getAllAssets, getAssetObjectUrl } from "@/lib/assets-db";
import { listCards } from "@/lib/cards-db";
import type { UploadScanReportItem } from "@/types/asset-duplicates";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import type { Dispatch, SetStateAction } from "react";

type AssetsModalMode = "manage" | "select";

type AssetsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode?: AssetsModalMode;
  onSelect?: (asset: AssetRecord) => void;
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

export default function AssetsModal({
  isOpen,
  onClose,
  mode = "manage",
  onSelect,
}: AssetsModalProps) {
  const { t } = useI18n();
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [search, setSearch] = useState("");
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [uploadNotice, setUploadNotice] = useState<UploadNotice | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const [uploadReview, setUploadReview] = useState<UploadNotice | null>(null);
  const reviewResolverRef = useRef<((shouldContinue: boolean) => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { scanFiles, addToIndex, removeFromIndex, existingNames } = useAssetHashIndex();

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
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || assets.length === 0) {
      setThumbUrls({});
      return;
    }

    let cancelled = false;
    const localUrls: Record<string, string> = {};

    (async () => {
      for (const asset of assets) {
        try {
          const url = await getAssetObjectUrl(asset.id);
          if (!url) continue;
          localUrls[asset.id] = url;
        } catch {
          // Ignore individual asset errors for now.
        }
      }
      if (!cancelled) {
        setThumbUrls(localUrls);
      } else {
        Object.values(localUrls).forEach((url) => {
          URL.revokeObjectURL(url);
        });
      }
    })();

    return () => {
      cancelled = true;
      Object.values(localUrls).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [isOpen, assets]);

  useEffect(() => {
    if (!isOpen && selectedIds.size > 0) {
      setSelectedIds(new Set());
    }
  }, [isOpen, selectedIds]);

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

  const filteredAssets = search
    ? assets.filter((asset) => asset.name.toLowerCase().includes(search.toLowerCase()))
    : assets;

  const handleConfirmDelete = async (ids: string[]) => {
    try {
      await deleteAssets(ids);
      removeFromIndex(ids);
      const records = await getAllAssets();
      setAssets(records);
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
      let scanByIndex: Map<number, string> | null = null;
      let reportByIndex: Map<
        number,
        "unique" | "duplicate-existing" | "duplicate-batch" | "name-collision" | "error"
      > | null = null;
      let scanItems: UploadScanReportItem[] | null = null;

      try {
        const report = await scanFiles(files, (hashedCount, total, file) => {
          if (!ENABLE_UPLOAD_PROGRESS) return;
          setUploadProgress((prev) =>
            prev
              ? {
                  ...prev,
                  completed: hashedCount,
                  total,
                  currentFileName: file.name,
                  isIndeterminate: false,
                }
              : prev,
          );
        });
        const issueCount = report.items.filter((item) => item.status !== "unique").length;
        scanByIndex = new Map(
          report.items
            .filter((item) => item.hash)
            .map((item) => [item.fileIndex, item.hash as string]),
        );
        reportByIndex = new Map(report.items.map((item) => [item.fileIndex, item.status]));
        scanItems = report.items;
        if (issueCount > 0) {
          // noop - surfaced via modal
        }
      } catch (scanError) {
        // eslint-disable-next-line no-console
        console.warn("[AssetsModal] Upload scan failed", scanError);
      }

      const claimedNames = new Set(existingNames);
      assets.forEach((asset) => {
        claimedNames.add(asset.name);
      });
      const finalNameByIndex = new Map<number, string>();
      const skipIndices = new Set<number>();

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const status = reportByIndex?.get(index);
        if (status === "duplicate-existing" || status === "duplicate-batch") {
          skipIndices.add(index);
          continue;
        }

        let nextName = file.name;
        if (claimedNames.has(nextName)) {
          nextName = getNextAvailableFilename(claimedNames, nextName);
        }
        claimedNames.add(nextName);
        finalNameByIndex.set(index, nextName);
      }

      const duplicateItems = (scanItems ?? []).filter(
        (item) => item.status === "duplicate-existing" || item.status === "duplicate-batch",
      );
      const renameItems = Array.from(finalNameByIndex.entries())
        .filter(([index, name]) => files[index]?.name && files[index].name !== name)
        .map(([index, name]) => ({
          original: files[index].name,
          renamed: name,
        }));
      if (duplicateItems.length > 0 || renameItems.length > 0) {
        if (ENABLE_UPLOAD_PROGRESS) {
          setUploadReview({
            duplicates: duplicateItems,
            renames: renameItems,
          });
          setUploadProgress((prev) =>
            prev
              ? {
                  ...prev,
                  phase: "review",
                  isIndeterminate: true,
                  currentFileName: null,
                  renamedCount: renameItems.length,
                  duplicateCount: duplicateItems.length,
                }
              : prev,
          );
          const shouldContinue = await new Promise<boolean>((resolve) => {
            reviewResolverRef.current = resolve;
          });
          reviewResolverRef.current = null;
          if (!shouldContinue) {
            setUploadProgress((prev) =>
              prev
                ? {
                    ...prev,
                    phase: "cancelled",
                    isIndeterminate: true,
                    currentFileName: null,
                  }
                : prev,
            );
            return;
          }
          setUploadReview(null);
        } else {
          setUploadNotice({
            duplicates: duplicateItems,
            renames: renameItems,
          });
        }
      }

      if (ENABLE_UPLOAD_PROGRESS) {
        setUploadProgress((prev) =>
          prev
            ? {
                ...prev,
                phase: "processing",
                isIndeterminate: false,
                completed: completedCount,
                renamedCount: renameItems.length,
                duplicateCount: duplicateItems.length,
              }
            : prev,
        );
      }

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        if (skipIndices.has(index)) {
          completedCount += 1;
          if (ENABLE_UPLOAD_PROGRESS) {
            setUploadProgress((prev) =>
              prev
                ? {
                    ...prev,
                    completed: completedCount,
                    currentFileName: file.name,
                    skippedCount: prev.skippedCount + 1,
                  }
                : prev,
            );
          }
          continue;
        }
        if (!file.type.startsWith("image/")) {
          // Basic type guard; more detailed validation can be added later.
          // eslint-disable-next-line no-console
          console.warn("[AssetsModal] Unsupported file type", file.type);
          // Continue with the next file instead of aborting the whole batch.
          // eslint-disable-next-line no-continue
          completedCount += 1;
          if (ENABLE_UPLOAD_PROGRESS) {
            setUploadProgress((prev) =>
              prev
                ? {
                    ...prev,
                    completed: completedCount,
                    currentFileName: file.name,
                    skippedCount: prev.skippedCount + 1,
                  }
                : prev,
            );
          }
          continue;
        }

        try {
          if (ENABLE_UPLOAD_PROGRESS) {
            setUploadProgress((prev) =>
              prev
                ? {
                    ...prev,
                    currentFileName: file.name,
                  }
                : prev,
            );
          }
          const url = URL.createObjectURL(file);
          const probe = new Image();
          probe.src = url;

          await new Promise<void>((resolve, reject) => {
            probe.onload = () => resolve();
            probe.onerror = () => reject(new Error("Failed to load image"));
          });

          const width = probe.naturalWidth;
          const height = probe.naturalHeight;
          URL.revokeObjectURL(url);

          const id = generateId();
          const resolvedName = finalNameByIndex.get(index) ?? file.name;

          await addAsset(id, file, {
            name: resolvedName,
            mimeType: file.type,
            width,
            height,
          });
          if (ENABLE_UPLOAD_PROGRESS) {
            setUploadProgress((prev) =>
              prev
                ? {
                    ...prev,
                    uploadedCount: prev.uploadedCount + 1,
                  }
                : prev,
            );
          }

          let hash = scanByIndex?.get(index);
          if (!hash) {
            try {
              const buffer = await file.arrayBuffer();
              hash = await hashArrayBufferSha256(buffer);
            } catch (hashError) {
              // eslint-disable-next-line no-console
              console.warn("[AssetsModal] Failed to hash uploaded file", hashError);
            }
          }

          if (hash) {
            addToIndex(hash, {
              id,
              name: resolvedName,
              mimeType: file.type,
              width,
              height,
              createdAt: Date.now(),
              size: file.size,
            });
          }
          completedCount += 1;
          if (ENABLE_UPLOAD_PROGRESS) {
            setUploadProgress((prev) =>
              prev
                ? {
                    ...prev,
                    completed: completedCount,
                  }
                : prev,
            );
          }
        } catch (fileError) {
          // eslint-disable-next-line no-console
          console.error("[AssetsModal] Upload failed for file", file.name, fileError);
          completedCount += 1;
          if (ENABLE_UPLOAD_PROGRESS) {
            setUploadProgress((prev) =>
              prev
                ? {
                    ...prev,
                    completed: completedCount,
                    errorCount: prev.errorCount + 1,
                  }
                : prev,
            );
          }
        } finally {
          await maybeDelayUploadStep();
        }
      }

      if (ENABLE_UPLOAD_PROGRESS) {
        setUploadProgress((prev) =>
          prev
            ? {
                ...prev,
                phase: "refreshing",
                isIndeterminate: true,
                currentFileName: null,
              }
            : prev,
        );
      }

      const records = await getAllAssets();
      setAssets(records);
      if (ENABLE_UPLOAD_PROGRESS) {
        setUploadProgress((prev) =>
          prev
            ? {
                ...prev,
                phase: "done",
                isIndeterminate: false,
                currentFileName: null,
              }
            : prev,
        );
        keepProgressOpen = true;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[AssetsModal] Upload failed", error);
    } finally {
      if (ENABLE_UPLOAD_PROGRESS && !keepProgressOpen) {
        setUploadProgress(null);
      }
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

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("heading.assets")}
      contentClassName={styles.assetsPopover}
    >
      <div className={styles.assetsToolbar}>
        <div className="input-group input-group-sm" style={{ maxWidth: 260 }}>
          <span className="input-group-text">
            <Search className={styles.icon} aria-hidden="true" />
          </span>
          <input
            type="search"
            placeholder={t("placeholders.searchAssets")}
            className={`form-control form-control-sm bg-white text-dark ${styles.assetsSearch}`}
            title={t("tooltip.searchAssets")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className={styles.assetsToolbarSpacer} />
        <div className={styles.assetsActions}>
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
      <div className={styles.assetsGridContainer}>
        {filteredAssets.length === 0 ? (
          <div className={styles.assetsEmptyState}>{t("empty.noAssets")}</div>
        ) : (
          <div className={styles.assetsGrid}>
            {filteredAssets.map((asset) => {
              const isSelected = selectedIds.has(asset.id);
              return (
                <button
                  key={asset.id}
                  type="button"
                  className={`${styles.assetsItem} ${isSelected ? styles.assetsItemSelected : ""}`}
                  title={asset.name}
                  onClick={() => {
                    setSelectedIds((prev) => {
                      if (mode === "select") {
                        const next = new Set<string>();
                        next.add(asset.id);
                        return next;
                      }
                      const next = new Set(prev);
                      if (next.has(asset.id)) {
                        next.delete(asset.id);
                      } else {
                        next.add(asset.id);
                      }
                      return next;
                    });
                  }}
                  onDoubleClick={() => {
                    if (mode !== "select" || !onSelect) return;
                    onSelect(asset);
                    onClose();
                  }}
                >
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
                  <div className={styles.assetsReportList}>
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
                  <div className={styles.assetsReportList}>
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
    </ModalShell>
  );
}

type AssetsFooterProps = {
  mode: AssetsModalMode;
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
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => onClose()}
        >
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
          {assetCount === 1 ? t("label.asset") : t("label.assets")}{" "}
          {t("status.willClearImagesOn")} {cardCountValue} {cardCountLabel}
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
              if (!imageMatch && !iconMatch) return;

              const nextDraft = {
                ...draft,
              } as CardDataByTemplate[TemplateId];

              if (imageMatch) {
                nextDraft.imageAssetId = undefined;
                nextDraft.imageAssetName = undefined;
                nextDraft.imageScale = undefined;
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
