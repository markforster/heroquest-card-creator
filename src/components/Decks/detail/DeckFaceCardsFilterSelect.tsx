"use client";

import CollectionsFilterSelect, {
  type CollectionsFilterValue,
} from "@/components/common/CollectionsFilterSelect";
import type { DeckFaceFilter } from "@/components/Decks/types/deck-backs";
import { useI18n } from "@/i18n/I18nProvider";

type DeckFaceCardsFilterSelectProps = {
  activeFilter: DeckFaceFilter;
  onFilterChange: (next: DeckFaceFilter) => void;
  visibleCollections: Array<{ id: string; name: string; description?: string; cardIds: string[] }>;
  recentCardsCount: number;
  overallCount: number;
  unfiledCount: number;
};

export default function DeckFaceCardsFilterSelect({
  activeFilter,
  onFilterChange,
  visibleCollections,
  recentCardsCount,
  overallCount,
  unfiledCount,
}: DeckFaceCardsFilterSelectProps) {
  const { t } = useI18n();

  return (
    <CollectionsFilterSelect
      inputId="deck-face-cards-filter-select"
      ariaLabel={t("heading.collections")}
      selectedValue={activeFilter.type === "recentlyDeleted" ? { type: "all" } : activeFilter}
      onValueChange={(next: CollectionsFilterValue) => onFilterChange(next as DeckFaceFilter)}
      collections={visibleCollections}
      includeSystemFilters
      recentCardsCount={recentCardsCount}
      overallCount={overallCount}
      unfiledCount={unfiledCount}
    />
  );
}
