"use client";

import { useMemo } from "react";
import { Folder, LibrarySquare } from "lucide-react";
import Select, { type SingleValue, type StylesConfig } from "react-select";

import styles from "@/app/page.module.css";
import { buildCollectionsTree } from "@/components/Stockpile/collections-tree";
import type { DeckFaceFilter } from "@/components/Decks/types/deck-backs";
import { useI18n } from "@/i18n/I18nProvider";

type DeckFaceCardsFilterSelectProps = {
  activeFilter: DeckFaceFilter;
  onFilterChange: (next: DeckFaceFilter) => void;
  visibleCollections: Array<{ id: string; name: string; description?: string; cardIds: string[] }>;
  collectionCounts: Map<string, number>;
  recentCardsCount: number;
  overallCount: number;
  unfiledCount: number;
};

type FilterOption = {
  value: string;
  label: string;
  kind: "system" | "collection" | "folder" | "divider";
  count?: number;
  depth?: number;
  fullName?: string;
  filter?: DeckFaceFilter;
  isDisabled?: boolean;
};

const selectStyles: StylesConfig<FilterOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 38,
    backgroundColor: "var(--hq-surface-900)",
    borderColor: state.isFocused ? "var(--hq-accent)" : "var(--hq-border-mid)",
    boxShadow: state.isFocused ? "0 0 0 1px rgba(230, 179, 90, 0.35)" : "none",
    "&:hover": { borderColor: "var(--hq-accent)" },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "2px 8px",
  }),
  singleValue: (base) => ({
    ...base,
    color: "var(--hq-text)",
    fontSize: "var(--text-md)",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 5,
    backgroundColor: "var(--hq-popover-bg)",
    border: "1px solid var(--hq-popover-border)",
    boxShadow: "var(--shadow-popover)",
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: 320,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused
      ? "rgba(230, 179, 90, 0.16)"
      : state.isSelected
        ? "rgba(230, 179, 90, 0.24)"
        : "transparent",
    color: "var(--hq-text)",
    padding: "0",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "var(--hq-text-muted)",
    "&:hover": { color: "var(--hq-text)" },
  }),
  input: (base) => ({
    ...base,
    color: "var(--hq-text)",
  }),
};

export default function DeckFaceCardsFilterSelect({
  activeFilter,
  onFilterChange,
  visibleCollections,
  collectionCounts,
  recentCardsCount,
  overallCount,
  unfiledCount,
}: DeckFaceCardsFilterSelectProps) {
  const { t } = useI18n();

  const options = useMemo<FilterOption[]>(() => {
    const baseOptions: FilterOption[] = [
      {
        value: "recent",
        kind: "system",
        label: t("actions.recentCards"),
        count: recentCardsCount,
        filter: { type: "recent" },
      },
      {
        value: "all",
        kind: "system",
        label: t("actions.allCards"),
        count: overallCount,
        filter: { type: "all" },
      },
      {
        value: "unfiled",
        kind: "system",
        label: t("actions.unfiled"),
        count: unfiledCount,
        filter: { type: "unfiled" },
      },
    ];

    const dividerOption: FilterOption = {
      value: "__divider__",
      kind: "divider",
      label: "",
      isDisabled: true,
    };

    const treeData = buildCollectionsTree(visibleCollections, { collectionCounts });
    const treeOptions: FilterOption[] = [];
    const flattenNodes = (
      nodes: ReturnType<typeof buildCollectionsTree>["nodes"],
      depth: number,
    ) => {
      nodes.forEach((node) => {
        if (node.type === "folder") {
          treeOptions.push({
            value: `folder:${node.pathId}`,
            kind: "folder",
            label: node.label,
            count: node.count,
            depth,
            fullName: node.pathId,
            isDisabled: true,
          });
          flattenNodes(node.children, depth + 1);
          return;
        }

        treeOptions.push({
          value: `collection:${node.id}`,
          kind: "collection",
          label: node.label,
          count: node.count,
          depth,
          fullName: node.name,
          filter: { type: "collection", id: node.id },
        });
      });
    };
    flattenNodes(treeData.nodes, 1);

    return [...baseOptions, dividerOption, ...treeOptions];
  }, [collectionCounts, overallCount, recentCardsCount, t, unfiledCount, visibleCollections]);

  const selected = useMemo(() => {
    if (activeFilter.type === "collection") {
      return options.find((option) => option.value === `collection:${activeFilter.id}`) ?? null;
    }
    return options.find((option) => option.filter?.type === activeFilter.type) ?? null;
  }, [activeFilter, options]);

  const handleChange = (next: SingleValue<FilterOption>) => {
    if (!next) return;
    if (!next.filter) return;
    onFilterChange(next.filter);
  };

  return (
    <div className={styles.deckFaceCardsFilterSelect}>
      <Select<FilterOption, false>
        inputId="deck-face-cards-filter-select"
        aria-label={t("heading.collections")}
        classNamePrefix="deck-face-cards-filter"
        isClearable={false}
        isSearchable={false}
        options={options}
        value={selected}
        isOptionDisabled={(option) => Boolean(option.isDisabled)}
        onChange={handleChange}
        styles={selectStyles}
        formatOptionLabel={(option, meta) => {
          if (option.kind === "divider") {
            return <div className={styles.deckFaceCardsFilterDivider} aria-hidden="true" />;
          }

          const isCollection = option.kind === "collection";
          const isFolder = option.kind === "folder";
          const showLeafIcon = isCollection;
          const showFolderIcon = isFolder && meta.context === "menu";
          const indent = meta.context === "menu" && option.depth ? option.depth - 1 : 0;
          return (
            <div
              className={styles.deckFaceCardsFilterOption}
              style={{ ["--deck-filter-depth" as never]: indent }}
              title={option.fullName ?? option.label}
            >
              <div className={styles.deckFaceCardsFilterOptionStart}>
                {showFolderIcon ? (
                  <Folder
                    className={`${styles.deckFaceCardsFilterFolderIcon} ${styles.stockpileTreeIconFolder}`}
                    aria-hidden="true"
                  />
                ) : null}
                {showLeafIcon ? (
                  <LibrarySquare
                    className={`${styles.deckFaceCardsFilterLeafIcon} ${styles.stockpileTreeIconLeaf}`}
                    aria-hidden="true"
                  />
                ) : null}
                <span className={styles.deckFaceCardsFilterOptionLabel}>{option.label}</span>
              </div>
              <span className={styles.deckFaceCardsFilterOptionCountBadge}>
                {option.count ?? 0}
              </span>
            </div>
          );
        }}
      />
    </div>
  );
}
