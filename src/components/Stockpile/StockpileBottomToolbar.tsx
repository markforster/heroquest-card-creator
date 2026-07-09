"use client";

import { useEffect, useRef } from "react";
import { Bookmark, Download, Eye, Folder, Trash2 } from "lucide-react";

import styles from "@/app/page.module.css";
import type { StockpileBottomToolbarProps } from "@/components/Stockpile/types";
import StockpileToolbarSpacer from "@/components/Stockpile/StockpileToolbarSpacer";
import { useI18n } from "@/i18n/I18nProvider";

function FolderBookmarkIcon() {
  return (
    <span className={styles.stockpileBottomToolbarFolderBookmarkIcon} aria-hidden="true">
      <Folder size={16} strokeWidth={1.8} />
      <Bookmark
        size={9}
        strokeWidth={2}
        className={styles.stockpileBottomToolbarFolderBookmarkGlyph}
      />
    </span>
  );
}

export default function StockpileBottomToolbar({
  isSelectAllChecked,
  isSelectAllIndeterminate,
  isSelectAllDisabled,
  isSelectNoneDisabled,
  deleteLabel,
  exportLabel,
  onSelectAllToggle,
  onSelectNone,
  isAddToCollectionDisabled = true,
  isDeleteDisabled = true,
  isExportDisabled = true,
  isLoadDisabled = true,
  onAddToCollection,
  onDelete,
  onExport,
  onLoad,
}: StockpileBottomToolbarProps) {
  const { t } = useI18n();
  const selectNoneLabel = t("form.selectNone");
  const stockpileToolbarActionsLabel = t("aria.stockpileToolbarActions");
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const checkbox = selectAllRef.current;
    if (!checkbox) return;
    checkbox.checked = isSelectAllChecked;
    checkbox.indeterminate = isSelectAllIndeterminate;
  }, [isSelectAllChecked, isSelectAllIndeterminate]);

  return (
    <div className={styles.stockpileBottomToolbar}>
      <div className={styles.stockpileBottomToolbarSelection}>
        <label
          className="form-check form-check-inline mb-0"
          title={t("tooltip.selectAllCards")}
        >
          <input
            ref={selectAllRef}
            className="form-check-input hq-checkbox"
            type="checkbox"
            disabled={isSelectAllDisabled}
            onChange={onSelectAllToggle}
          />
          <span className={`form-check-label ${styles.selectAllLabel}`}>{t("form.selectAll")}</span>
        </label>
        <button
          type="button"
          className={styles.stockpileBottomToolbarTextAction}
          disabled={isSelectNoneDisabled}
          onClick={onSelectNone}
        >
          {selectNoneLabel === "form.selectNone" ? "Select none" : selectNoneLabel}
        </button>
      </div>
      <StockpileToolbarSpacer grow />
      <div
        role="group"
        aria-label={
          stockpileToolbarActionsLabel === "aria.stockpileToolbarActions"
            ? "Stockpile toolbar actions"
            : stockpileToolbarActionsLabel
        }
        className={styles.stockpileBottomToolbarActions}
      >
        <button
          type="button"
          disabled={isAddToCollectionDisabled}
          aria-label={t("actions.addToCollection")}
          title={t("actions.addToCollection")}
          className={`btn btn-outline-light btn-sm ${styles.stockpileBottomToolbarActionButton}`}
          onClick={onAddToCollection}
        >
          <span className={styles.stockpileBottomToolbarActionIcon}>
            <FolderBookmarkIcon />
          </span>
          <span className={styles.stockpileBottomToolbarActionLabel}>{t("actions.addToCollection")}</span>
        </button>
        <button
          type="button"
          disabled={isDeleteDisabled}
          aria-label={deleteLabel}
          title={deleteLabel}
          className={`btn btn-outline-danger btn-sm ${styles.stockpileBottomToolbarActionButton}`}
          onClick={onDelete}
        >
          <span className={styles.stockpileBottomToolbarActionIcon}>
            <Trash2 size={16} aria-hidden="true" />
          </span>
          <span className={styles.stockpileBottomToolbarActionLabel}>{deleteLabel}</span>
        </button>
        <button
          type="button"
          disabled={isExportDisabled}
          aria-label={exportLabel}
          title={exportLabel}
          className={`btn btn-outline-light btn-sm ${styles.stockpileBottomToolbarActionButton}`}
          onClick={onExport}
        >
          <span className={styles.stockpileBottomToolbarActionIcon}>
            <Download size={16} aria-hidden="true" />
          </span>
          <span className={styles.stockpileBottomToolbarActionLabel}>{exportLabel}</span>
        </button>
        <button
          type="button"
          disabled={isLoadDisabled}
          aria-label={t("actions.load")}
          title={t("actions.load")}
          className={`btn btn-primary btn-sm ${styles.stockpileBottomToolbarActionButton}`}
          onClick={onLoad}
        >
          <span className={styles.stockpileBottomToolbarActionIcon}>
            <Eye size={16} aria-hidden="true" />
          </span>
          <span className={styles.stockpileBottomToolbarActionLabel}>{t("actions.load")}</span>
        </button>
      </div>
    </div>
  );
}
