"use client";

import { Search, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import IconButton from "@/components/common/IconButton";
import ModalShell from "@/components/common/ModalShell";
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
import type { OpenCloseProps } from "@/types/ui";

type AssetsPanelMode = "manage" | "select";

type AssetsPanelProps = OpenCloseProps & {
  mode?: AssetsPanelMode;
  onSelect?: (asset: AssetRecord) => void;
  onSelectionChange?: (assets: AssetRecord[]) => void;
  refreshKey?: number;
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
}: AssetsPanelProps) {
  const { t } = useI18n();
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [search, setSearch] = useState("");
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
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
  }, [isOpen, refreshKey]);

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
    if (nextOrder.length !== selectedOrder.length) {
      setSelectedOrder(nextOrder);
      setSelectedIds(new Set(nextOrder));
    }
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

      try {
        const scanResult = await scanFiles(files, {
          onProgress: async ({ completed, total }) => {
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
        });
        scanByIndex = scanResult.scanByIndex;
        reportByIndex = scanResult.reportByIndex;
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
      const existing = new Set(existingNames.map((name) => name.toLowerCase()));
      const colliding = new Set<string>();
      const batchHashes = new Set<string>();
      const batchNames = new Set<string>();
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
            duplicates.push({ file, status: "duplicate-existing", fileIndex: index });
            skippedCount += 1;
            continue;
          }
          if (report === "duplicate-batch") {
            duplicates.push({ file, status: "duplicate-batch", fileIndex: index });
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
            duplicates.push({ file, status: "duplicate-batch", fileIndex: index });
            skippedCount += 1;
            continue;
          }
          batchHashes.add(fileHash);
        }

        let nextName = name;
        let isRename = false;
        if (existing.has(nameLower) || batchNames.has(nameLower) || colliding.has(nameLower)) {
          nextName = getNextAvailableFilename(name, existing, batchNames);
          isRename = true;
          renames.push({ original: name, renamed: nextName });
        }

        try {
          const record = await addAsset({
            id: generateId(),
            name: nextName,
            mimeType: file.type,
            size: file.size,
            width: null,
            height: null,
            blob: file,
          });

          if (record) {
            uploaded.add(record.id);
            existing.add(nextName.toLowerCase());
            batchNames.add(nextName.toLowerCase());
            if (fileHash) {
              addToIndex(record.id, fileHash);
            }
          } else {
            errorCount += 1;
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

  return (
    <div className={styles.assetsPanel}>
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
                          setSelectedOrder((order) => order.filter((id) => id !== asset.id));
                        } else {
                          next.add(asset.id);
                          setSelectedOrder((order) => [asset.id, ...order.filter((id) => id !== asset.id)]);
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
