"use client";

import { LayoutGrid, Search, TableProperties } from "lucide-react";
import { useEffect, useRef } from "react";
import { ToggleButton, ToggleButtonGroup } from "react-bootstrap";

import styles from "@/app/page.module.css";
import StockpileToolbarFilterSelect from "@/components/Stockpile/StockpileToolbarFilterSelect";
import StockpileToolbarGroupSelect from "@/components/Stockpile/StockpileToolbarGroupSelect";
import StockpileToolbarPairingFilterSelect from "@/components/Stockpile/StockpileToolbarPairingFilterSelect";
import StockpileToolbarSortSelect from "@/components/Stockpile/StockpileToolbarSortSelect";
import StockpileToolbarSpacer from "@/components/Stockpile/StockpileToolbarSpacer";
import type { StockpilePrimaryToolbarProps } from "@/components/Stockpile/types";
import { useI18n } from "@/i18n/I18nProvider";

export default function StockpilePrimaryToolbar({
  search,
  onSearchChange,
  onPrimarySearchReady,
  viewMode,
  onViewModeChange,
  filterValue,
  onFilterChange,
  filterOptions,
  sortValue,
  onSortChange,
  sortOptions,
  groupValue,
  onGroupChange,
  groupOptions,
  pairingFilterValue = "all",
  onPairingFilterChange,
  pairingFilterOptions = [],
  isPairingFilterDisabled = false,
  isSearchDisabled = false,
  isFilterDisabled = false,
  isSortDisabled = false,
  isGroupDisabled = false,
  isViewModeDisabled = false,
}: StockpilePrimaryToolbarProps) {
  const { t } = useI18n();
  const searchLabel = t("tooltip.searchCards");
  const searchPlaceholder = t("placeholders.searchCards");
  const filterLabel = t("tooltip.filterCards");
  const sortLabel = t("tooltip.sortCards");
  const groupLabel = t("tooltip.groupCards");
  const pairingFilterLabel = t("tooltip.filterCardsByPairingStatus");
  const gridViewLabel = t("label.gridView");
  const tableViewLabel = t("label.tableView");
  const viewGroupLabel = t("aria.viewMode");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!onPrimarySearchReady) return;
    onPrimarySearchReady(() => {
      const input = searchInputRef.current;
      if (!input || input.disabled) return false;
      input.focus();
      input.select();
      return true;
    });
    return () => onPrimarySearchReady(null);
  }, [onPrimarySearchReady]);

  return (
    <div className={styles.stockpilePrimaryToolbar}>
      <div className={`${styles.stockpilePrimaryToolbarRow} d-flex align-items-center gap-2`}>
        <div className={styles.stockpilePrimaryToolbarSearch}>
          <div className={`input-group input-group-sm ${styles.cardsSearchGroup}`}>
            <span className={`input-group-text ${styles.stockpilePrimaryToolbarSearchIcon}`}>
              <Search size={16} aria-hidden="true" />
            </span>
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              disabled={isSearchDisabled}
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
              title={searchLabel}
              className={`form-control form-control-sm ${styles.assetsSearch} ${styles.themedFormControl} ${styles.stockpilePrimaryToolbarSearchInput}`}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        </div>

        <StockpileToolbarSpacer />

        <div className={styles.stockpilePrimaryToolbarControls}>
          <StockpileToolbarFilterSelect
            value={filterValue}
            onChange={onFilterChange}
            options={filterOptions}
            disabled={isFilterDisabled}
            ariaLabel={filterLabel}
          />
          <StockpileToolbarSpacer />
          <StockpileToolbarSortSelect
            value={sortValue}
            onChange={onSortChange}
            options={sortOptions}
            disabled={isSortDisabled}
            ariaLabel={sortLabel}
          />
          <StockpileToolbarSpacer />
          <StockpileToolbarGroupSelect
            value={groupValue}
            onChange={onGroupChange}
            options={groupOptions}
            disabled={isGroupDisabled}
            ariaLabel={groupLabel}
          />
          {onPairingFilterChange && pairingFilterOptions.length > 0 ? (
            <>
              <StockpileToolbarSpacer />
              <StockpileToolbarPairingFilterSelect
                value={pairingFilterValue}
                onChange={onPairingFilterChange}
                options={pairingFilterOptions}
                disabled={isPairingFilterDisabled}
                ariaLabel={pairingFilterLabel}
              />
            </>
          ) : null}
          <StockpileToolbarSpacer />
          <div
            role="group"
            aria-label={viewGroupLabel}
            className={`${styles.stockpilePrimaryToolbarGroupShell} ${styles.stockpilePrimaryToolbarViewGroup}`}
          >
            <ToggleButtonGroup
              type="radio"
              name="stockpile-primary-view-mode"
              value={viewMode}
              className={styles.stockpilePrimaryToolbarToggleGroup}
              onChange={(next) => {
                if (next === "grid" || next === "table") {
                  onViewModeChange(next);
                }
              }}
            >
              <ToggleButton
                id="stockpile-primary-view-grid"
                value="grid"
                variant="outline-light"
                disabled={isViewModeDisabled}
                aria-label={gridViewLabel}
                title={gridViewLabel}
                className={styles.stockpilePrimaryToolbarIconToggle}
              >
                <LayoutGrid size={16} aria-hidden="true" />
              </ToggleButton>
              <ToggleButton
                id="stockpile-primary-view-table"
                value="table"
                variant="outline-light"
                disabled={isViewModeDisabled}
                aria-label={tableViewLabel}
                title={tableViewLabel}
                className={styles.stockpilePrimaryToolbarIconToggle}
              >
                <TableProperties size={16} aria-hidden="true" />
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
