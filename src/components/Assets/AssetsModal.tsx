"use client";

import { Search, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import IconButton from "@/components/IconButton";
import ModalShell from "@/components/ModalShell";
import { useAssetHashIndex } from "@/hooks/useAssetHashIndex";
import { generateId } from "@/lib";
import { getNextAvailableFilename } from "@/lib/asset-filename";
import { hashArrayBufferSha256 } from "@/lib/asset-hash";
import type { AssetRecord } from "@/lib/assets-db";
import { addAsset, deleteAssets, getAllAssets, getAssetObjectUrl } from "@/lib/assets-db";
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

export default function AssetsModal({
  isOpen,
  onClose,
  mode = "manage",
  onSelect,
}: AssetsModalProps) {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [search, setSearch] = useState("");
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [uploadNotice, setUploadNotice] = useState<UploadNotice | null>(null);
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

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Assets">
      <div className={styles.assetsToolbar}>
        <div className="input-group input-group-sm" style={{ maxWidth: 260 }}>
          <span className="input-group-text">
            <Search className={styles.icon} aria-hidden="true" />
          </span>
          <input
            type="search"
            placeholder="Search assets..."
            className={`form-control form-control-sm bg-white text-dark ${styles.assetsSearch}`}
            title="Search assets by name"
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
            title="Upload new images into your asset library"
          >
            Upload
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
              title="Delete selected assets"
            >
              Delete
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

              try {
                setUploadNotice(null);
                let scanByIndex: Map<number, string> | null = null;
                let reportByIndex: Map<
                  number,
                  "unique" | "duplicate-existing" | "duplicate-batch" | "name-collision" | "error"
                > | null = null;
                let scanItems: UploadScanReportItem[] | null = null;

                try {
                  const report = await scanFiles(files);
                  const issueCount = report.items.filter((item) => item.status !== "unique").length;
                  scanByIndex = new Map(
                    report.items
                      .filter((item) => item.hash)
                      .map((item) => [item.fileIndex, item.hash as string]),
                  );
                  reportByIndex = new Map(
                    report.items.map((item) => [item.fileIndex, item.status]),
                  );
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

                for (const [index, file] of files.entries()) {
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
                  (item) =>
                    item.status === "duplicate-existing" || item.status === "duplicate-batch",
                );
                const renameItems = Array.from(finalNameByIndex.entries())
                  .filter(([index, name]) => files[index]?.name && files[index].name !== name)
                  .map(([index, name]) => ({
                    original: files[index].name,
                    renamed: name,
                  }));
                if (duplicateItems.length > 0 || renameItems.length > 0) {
                  setUploadNotice({
                    duplicates: duplicateItems,
                    renames: renameItems,
                  });
                }

                for (const [index, file] of files.entries()) {
                  if (skipIndices.has(index)) {
                    continue;
                  }
                  if (!file.type.startsWith("image/")) {
                    // Basic type guard; more detailed validation can be added later.
                    // eslint-disable-next-line no-console
                    console.warn("[AssetsModal] Unsupported file type", file.type);
                    // Continue with the next file instead of aborting the whole batch.
                    // eslint-disable-next-line no-continue
                    continue;
                  }

                  try {
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
                  } catch (fileError) {
                    // eslint-disable-next-line no-console
                    console.error("[AssetsModal] Upload failed for file", file.name, fileError);
                  }
                }

                const records = await getAllAssets();
                setAssets(records);
              } catch (error) {
                // eslint-disable-next-line no-console
                console.error("[AssetsModal] Upload failed", error);
              } finally {
                event.target.value = "";
              }
            }}
          />
        </div>
      </div>
      <div className={styles.assetsGridContainer}>
        {filteredAssets.length === 0 ? (
          <div className={styles.assetsEmptyState}>No assets</div>
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
      <ModalShell
        isOpen={Boolean(
          uploadNotice && (uploadNotice.duplicates.length > 0 || uploadNotice.renames.length > 0),
        )}
        onClose={() => setUploadNotice(null)}
        title="Upload review"
        footer={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setUploadNotice(null)}
          >
            Ok
          </button>
        }
        contentClassName={styles.assetsReportPopover}
      >
        {uploadNotice ? (
          <div>
            {uploadNotice.duplicates.length > 0 ? (
              <>
                <div className={styles.assetsReportIntro}>
                  {uploadNotice.duplicates.length} file
                  {uploadNotice.duplicates.length === 1 ? "" : "s"} matched existing uploads or
                  duplicates in this batch and were skipped.
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
                          ? "Already in library"
                          : "Duplicate in batch"}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
            {uploadNotice.renames.length > 0 ? (
              <>
                <div className={styles.assetsReportIntro}>
                  {uploadNotice.renames.length} file
                  {uploadNotice.renames.length === 1 ? "" : "s"} were renamed to avoid filename
                  collisions.
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
  const {
    state: { cardDrafts },
    setCardDraft,
  } = useCardEditor();

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
          Cancel
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
          Select
        </button>
      </>
    );
  }

  if (confirmState) {
    const { assetIds, isDeleting } = confirmState;
    const assetCount = assetIds.length;
    const idSet = new Set(assetIds);

    let affectedDraftCount = 0;
    (Object.values(cardDrafts) as CardDataByTemplate[TemplateId][]).forEach((draft) => {
      if (draft && draft.imageAssetId && idSet.has(draft.imageAssetId)) {
        affectedDraftCount += 1;
      }
    });

    return (
      <>
        <div className={styles.assetsConfirmMessage}>
          Deleting {assetCount} asset{assetCount === 1 ? "" : "s"} will clear images on{" "}
          {affectedDraftCount} card draft{affectedDraftCount === 1 ? "" : "s"}. Continue?
        </div>
        <button
          type="button"
          className={styles.templateSecondaryButton}
          disabled={isDeleting}
          onClick={() => setConfirmState(null)}
        >
          Cancel
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
            (
              Object.entries(cardDrafts) as [
                TemplateId,
                CardDataByTemplate[TemplateId] | undefined,
              ][]
            ).forEach(([templateId, draft]) => {
              if (!draft || !("imageAssetId" in draft) || !draft.imageAssetId) return;
              if (!idSet.has(draft.imageAssetId)) return;

              setCardDraft(
                templateId as TemplateId,
                {
                  ...draft,
                  imageAssetId: undefined,
                  imageAssetName: undefined,
                  imageScale: undefined,
                  imageOriginalWidth: undefined,
                  imageOriginalHeight: undefined,
                  imageOffsetX: undefined,
                  imageOffsetY: undefined,
                } as never,
              );
            });

            await onConfirmDelete(ids);
            setConfirmState(null);
          }}
          title="Confirm deletion of selected assets"
        >
          Delete
        </IconButton>
      </>
    );
  }

  return null;
}
