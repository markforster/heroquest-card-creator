"use client";

import { AlertTriangle, Search } from "lucide-react";
import { useRef } from "react";

import styles from "@/app/page.module.css";
import { useMissingAssets } from "@/components/Providers/MissingAssetsContext";
import StockpileToolbarFilterSelect from "@/components/Stockpile/StockpileToolbarFilterSelect";
import type { StockpilePrimaryToolbarFilterGroup } from "@/components/Stockpile/types";
import { ENABLE_MISSING_ASSET_CHECKS } from "@/config/flags";
import { useI18n } from "@/i18n/I18nProvider";

type StockpileToolbarProps = {
  onOpenCollections: () => void;
  collectionsToggleLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  templateFilter: string;
  onTemplateFilterChange: (value: string) => void;
  filterValue: string;
  onFilterValueChange: (value: string) => void;
  filterOptions: StockpilePrimaryToolbarFilterGroup[];
  filterLabel: string;
  totalCount: number;
  faceCounts: { front: number; back: number };
  typeCounts: Map<string, number>;
  isPairMode: boolean;
  isPairBacks: boolean;
  isPairFronts: boolean;
  showUnpairedOnly: boolean;
  onShowUnpairedOnlyChange: (next: boolean) => void;
  showMissingArtworkOnly: boolean;
  onShowMissingArtworkOnlyChange: (next: boolean) => void;
  selectedCount: number;
  showSearchAndFilterControls?: boolean;
  showUnpairedToggle?: boolean;
};

export default function StockpileToolbar({
  onOpenCollections,
  collectionsToggleLabel,
  search,
  onSearchChange,
  templateFilter,
  onTemplateFilterChange,
  filterValue,
  onFilterValueChange,
  filterOptions,
  filterLabel,
  totalCount,
  faceCounts,
  typeCounts,
  isPairMode,
  isPairBacks,
  isPairFronts,
  showUnpairedOnly,
  onShowUnpairedOnlyChange,
  showMissingArtworkOnly,
  onShowMissingArtworkOnlyChange,
  selectedCount,
  showSearchAndFilterControls = true,
  showUnpairedToggle = true,
}: StockpileToolbarProps) {
  const { t } = useI18n();
  const { missingArtworkIds } = useMissingAssets();
  const showMissingArtworkToggle = ENABLE_MISSING_ASSET_CHECKS && missingArtworkIds.size > 0;
  const hasLeftControls =
    showSearchAndFilterControls || (!isPairMode && showUnpairedToggle);
  const hasRightControls = (!isPairMode && showMissingArtworkToggle) || isPairMode;
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  if (!hasLeftControls && !hasRightControls) {
    return null;
  }

  return (
    <div className={`${styles.assetsToolbar} d-flex align-items-center gap-2 px-2 py-2`}>
      <div className={`${styles.cardsFiltersRow} ${styles.uRowLg}`}>
        <div className={`${styles.cardsFiltersLeft} ${styles.uRowLg}`}>
          <button
            type="button"
            className={styles.collectionsToggleButton}
            onClick={onOpenCollections}
            title={t("heading.collections")}
            aria-label={t("heading.collections")}
          >
            <span className={styles.collectionsToggleTitle}>{t("label.collections")}</span>
            <span className={styles.collectionsToggleValue}>{collectionsToggleLabel}</span>
          </button>
          <div className="d-flex align-items-center gap-2">
            {showSearchAndFilterControls ? (
              <>
                <div
                  className={`input-group input-group-sm ${styles.cardsSearchGroup}`}
                  style={{ width: "17.25em" }}
                >
                  <span className={`input-group-text ${styles.themedInputGroupText}`}>
                    <Search className={styles.icon} aria-hidden="true" />
                  </span>
                  <input
                    ref={searchInputRef}
                    type="search"
                    placeholder={t("placeholders.searchCards")}
                    className={`form-control form-control-sm ${styles.assetsSearch} ${styles.themedFormControl} ${styles.cardsSearchInputFixed} ${styles.cardsSearchInputWithClear}`}
                    title={t("tooltip.searchCards")}
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                  />
                  {search.trim().length > 0 ? (
                    <button
                      type="button"
                      className={`btn-close ${styles.cardsSearchClearButton}`}
                      aria-label={t("actions.clear")}
                      title={t("actions.clear")}
                      onClick={() => {
                        onSearchChange("");
                        searchInputRef.current?.focus();
                      }}
                    />
                  ) : null}
                </div>
                <div className={styles.stockpileToolbarSharedFilter}>
                  <StockpileToolbarFilterSelect
                    value={filterValue}
                    onChange={onFilterValueChange}
                    options={filterOptions}
                    ariaLabel={t("tooltip.filterCards")}
                  />
                </div>
              </>
            ) : null}
            {!isPairMode && showUnpairedToggle ? (
              <label className="form-check form-check-inline mb-0 ms-2">
                <input
                  className="form-check-input hq-checkbox"
                  type="checkbox"
                  checked={showUnpairedOnly}
                  onChange={(event) => onShowUnpairedOnlyChange(event.target.checked)}
                />
                <span className={`form-check-label ${styles.selectAllLabel}`}>
                  {t("warning.notPaired")}
                </span>
              </label>
            ) : null}
          </div>
        </div>
        <div className={styles.cardsFiltersSpacer} />
        <div className={`${styles.cardsFiltersRight} ${styles.uRowLg}`}>
          {!isPairMode && showMissingArtworkToggle ? (
            <label className={`form-check form-check-inline mb-0 ${styles.missingArtworkFilter}`}>
              <input
                className="form-check-input hq-checkbox"
                type="checkbox"
                checked={showMissingArtworkOnly}
                onChange={(event) => onShowMissingArtworkOnlyChange(event.target.checked)}
              />
              <span className={styles.missingArtworkLabel}>{t("label.missingArtwork")}</span>
              <AlertTriangle className={styles.missingArtworkIcon} size={16} />
            </label>
          ) : null}
          {isPairMode ? (
            <div className={`${styles.assetsActions} d-flex align-items-center gap-2 ms-3`}>
              <span className={styles.cardsSelectionLabel}>{t("status.selectedCards")}</span>
              <span className="badge rounded-pill bg-warning text-dark fs-6 px-2 py-1">
                {selectedCount}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
