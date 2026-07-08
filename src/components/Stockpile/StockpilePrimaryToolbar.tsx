"use client";

import { useRef } from "react";
import { LayoutGrid, Search, TableProperties } from "lucide-react";
import { ToggleButton, ToggleButtonGroup } from "react-bootstrap";

import styles from "@/app/page.module.css";
import StockpileToolbarFilterSelect from "@/components/Stockpile/StockpileToolbarFilterSelect";
import StockpileToolbarSpacer from "@/components/Stockpile/StockpileToolbarSpacer";
import type { StockpilePrimaryToolbarProps } from "@/components/Stockpile/types";
import { useI18n } from "@/i18n/I18nProvider";

export default function StockpilePrimaryToolbar({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  filterValue,
  onFilterChange,
  filterOptions,
  showUnpairedOnly = false,
  onShowUnpairedOnlyChange,
  isUnpairedToggleDisabled = false,
  isSearchDisabled = false,
  isFilterDisabled = false,
  isViewModeDisabled = false,
}: StockpilePrimaryToolbarProps) {
  const { t } = useI18n();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchLabel = t("tooltip.searchCards");
  const searchPlaceholder = t("placeholders.searchCards");
  const clearLabel = t("actions.clear");
  const filterLabel = t("tooltip.filterCards");
  const notPairedLabel = t("warning.notPaired");
  const gridViewLabel = t("label.gridView");
  const tableViewLabel = t("label.tableView");
  const viewGroupLabel = t("aria.viewMode");

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
            {search.trim().length > 0 ? (
              <button
                type="button"
                disabled={isSearchDisabled}
                className={`btn-close ${styles.stockpilePrimaryToolbarClearButton}`}
                aria-label={clearLabel}
                title={clearLabel}
                onClick={() => {
                  onSearchChange("");
                  searchInputRef.current?.focus();
                }}
              >
                <span className="visually-hidden">{clearLabel}</span>
              </button>
            ) : null}
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
          {onShowUnpairedOnlyChange ? (
            <>
              <StockpileToolbarSpacer />
              <button
                type="button"
                disabled={isUnpairedToggleDisabled}
                aria-pressed={showUnpairedOnly}
                aria-label={notPairedLabel}
                title={notPairedLabel}
                className={`${styles.stockpilePrimaryToolbarTextToggle} ${
                  showUnpairedOnly ? styles.stockpilePrimaryToolbarTextToggleActive : ""
                }`}
                onClick={() => onShowUnpairedOnlyChange(!showUnpairedOnly)}
              >
                {notPairedLabel}
              </button>
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
