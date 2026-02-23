"use client";

import { AlertTriangle, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import { cardTemplates } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { ENABLE_MISSING_ASSET_CHECKS } from "@/config/flags";
import { useMissingAssets } from "@/components/Providers/MissingAssetsContext";

type StockpileToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  templateFilter: string;
  onTemplateFilterChange: (value: string) => void;
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
};

export default function StockpileToolbar({
  search,
  onSearchChange,
  templateFilter,
  onTemplateFilterChange,
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
}: StockpileToolbarProps) {
  const { t, language } = useI18n();
  const { missingArtworkIds } = useMissingAssets();
  const showMissingArtworkToggle = ENABLE_MISSING_ASSET_CHECKS && missingArtworkIds.size > 0;
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!filterMenuRef.current) return;
      if (!filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`${styles.assetsToolbar} d-flex align-items-center gap-2 px-2 py-2`}>
      <div className={`${styles.cardsFiltersRow} ${styles.uRowLg}`}>
        <div className={`${styles.cardsFiltersLeft} ${styles.uRowLg}`}>
          <div className="input-group input-group-sm" style={{ width: "17.25em" }}>
            <span className="input-group-text">
              <Search className={styles.icon} aria-hidden="true" />
            </span>
            <input
              type="search"
              placeholder={t("placeholders.searchCards")}
              className={`form-control form-control-sm bg-white text-dark ${styles.assetsSearch} ${styles.cardsSearchInputFixed}`}
              title={t("tooltip.searchCards")}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className={styles.cardsFilterMenu} ref={filterMenuRef}>
              <button
                type="button"
                className={styles.cardsFilterButton}
                title={t("tooltip.filterCards")}
                aria-expanded={isFilterMenuOpen}
                onClick={() => setIsFilterMenuOpen((prev) => !prev)}
              >
                <span>{filterLabel}</span>
              </button>
              {isFilterMenuOpen ? (
                <div className={styles.cardsFilterPopover} role="menu">
                  <button
                    type="button"
                    className={`${styles.cardsFilterItem} ${
                      templateFilter === "all" ? styles.cardsFilterItemActive : ""
                    }`}
                    role="menuitem"
                    onClick={() => {
                      onTemplateFilterChange("all");
                      setIsFilterMenuOpen(false);
                    }}
                  >
                    <span>{t("ui.allTypes")}</span>
                    <span className={styles.cardsFilterCount}>{totalCount}</span>
                  </button>
                  {!isPairBacks ? (
                    <>
                      <button
                        type="button"
                        className={`${styles.cardsFilterItem} ${
                          templateFilter === "front" ? styles.cardsFilterItemActive : ""
                        }`}
                        role="menuitem"
                        onClick={() => {
                          onTemplateFilterChange("front");
                          setIsFilterMenuOpen(false);
                        }}
                      >
                        <span>{t("cardFace.frontFacing")}</span>
                        <span className={styles.cardsFilterCount}>{faceCounts.front}</span>
                      </button>
                      {cardTemplates
                        .filter((template) => template.defaultFace === "front")
                        .map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            className={`${styles.cardsFilterItem} ${
                              templateFilter === template.id ? styles.cardsFilterItemActive : ""
                            }`}
                            role="menuitem"
                            onClick={() => {
                              onTemplateFilterChange(template.id);
                              setIsFilterMenuOpen(false);
                            }}
                          >
                            <span>{getTemplateNameLabel(language, template)}</span>
                            <span className={styles.cardsFilterCount}>
                              {typeCounts.get(template.id) ?? 0}
                            </span>
                          </button>
                        ))}
                    </>
                  ) : null}
                  {!isPairFronts ? (
                    <>
                      <button
                        type="button"
                        className={`${styles.cardsFilterItem} ${
                          templateFilter === "back" ? styles.cardsFilterItemActive : ""
                        }`}
                        role="menuitem"
                        onClick={() => {
                          onTemplateFilterChange("back");
                          setIsFilterMenuOpen(false);
                        }}
                      >
                        <span>{t("cardFace.backFacing")}</span>
                        <span className={styles.cardsFilterCount}>{faceCounts.back}</span>
                      </button>
                      {cardTemplates
                        .filter((template) => template.defaultFace === "back")
                        .map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            className={`${styles.cardsFilterItem} ${
                              templateFilter === template.id ? styles.cardsFilterItemActive : ""
                            }`}
                            role="menuitem"
                            onClick={() => {
                              onTemplateFilterChange(template.id);
                              setIsFilterMenuOpen(false);
                            }}
                          >
                            <span>{getTemplateNameLabel(language, template)}</span>
                            <span className={styles.cardsFilterCount}>
                              {typeCounts.get(template.id) ?? 0}
                            </span>
                          </button>
                        ))}
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
            {!isPairMode ? (
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
