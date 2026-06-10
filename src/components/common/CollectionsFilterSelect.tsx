"use client";

import { useMemo } from "react";
import { Folder, LibrarySquare } from "lucide-react";
import Select, { type SingleValue, type StylesConfig } from "react-select";

import styles from "@/app/page.module.css";
import { buildCollectionsTree } from "@/components/Stockpile/collections-tree";
import { useI18n } from "@/i18n/I18nProvider";

export type CollectionsFilterValue =
  | { type: "all" }
  | { type: "recent" }
  | { type: "unfiled" }
  | { type: "collection"; id: string };

type CollectionLike = {
  id: string;
  name: string;
  description?: string;
  cardIds?: string[];
};

type CollectionsFilterSelectProps = {
  selectedValue: CollectionsFilterValue | null;
  onValueChange: (next: CollectionsFilterValue) => void;
  collections: CollectionLike[];
  includeSystemFilters?: boolean;
  showCounts?: boolean;
  allowEmptySelection?: boolean;
  placeholder?: string;
  recentCardsCount?: number;
  overallCount?: number;
  unfiledCount?: number;
  inputId?: string;
  ariaLabel: string;
};

type FilterOption = {
  value: string;
  label: string;
  kind: "system" | "collection" | "folder" | "divider";
  count?: number;
  depth?: number;
  fullName?: string;
  filter?: CollectionsFilterValue;
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

export default function CollectionsFilterSelect({
  selectedValue,
  onValueChange,
  collections,
  includeSystemFilters = true,
  showCounts = true,
  allowEmptySelection = false,
  placeholder,
  recentCardsCount = 0,
  overallCount = 0,
  unfiledCount = 0,
  inputId,
  ariaLabel,
}: CollectionsFilterSelectProps) {
  const { t } = useI18n();

  const collectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    collections.forEach((collection) => {
      counts.set(collection.id, collection.cardIds?.length ?? 0);
    });
    return counts;
  }, [collections]);

  const options = useMemo<FilterOption[]>(() => {
    const baseOptions: FilterOption[] = includeSystemFilters
      ? [
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
        ]
      : [];

    const dividerOption: FilterOption = {
      value: "__divider__",
      kind: "divider",
      label: "",
      isDisabled: true,
    };

    const treeData = buildCollectionsTree(collections, { collectionCounts });
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

    if (includeSystemFilters && treeOptions.length > 0) {
      return [...baseOptions, dividerOption, ...treeOptions];
    }

    return [...baseOptions, ...treeOptions];
  }, [
    collectionCounts,
    collections,
    includeSystemFilters,
    overallCount,
    recentCardsCount,
    t,
    unfiledCount,
  ]);

  const selected = useMemo(() => {
    if (!selectedValue) {
      return allowEmptySelection ? null : options[0] ?? null;
    }
    if (selectedValue.type === "collection") {
      return options.find((option) => option.value === `collection:${selectedValue.id}`) ?? null;
    }
    return options.find((option) => option.filter?.type === selectedValue.type) ?? null;
  }, [allowEmptySelection, options, selectedValue]);

  const handleChange = (next: SingleValue<FilterOption>) => {
    if (!next?.filter) return;
    onValueChange(next.filter);
  };

  return (
    <div className={styles.deckFaceCardsFilterSelect}>
      <Select<FilterOption, false>
        inputId={inputId}
        aria-label={ariaLabel}
        classNamePrefix="deck-face-cards-filter"
        isClearable={false}
        isSearchable={false}
        placeholder={placeholder}
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
              {showCounts ? (
                <span className={styles.deckFaceCardsFilterOptionCountBadge}>
                  {option.count ?? 0}
                </span>
              ) : null}
            </div>
          );
        }}
      />
    </div>
  );
}
