"use client";

import styles from "@/app/page.module.css";
import CardFan from "@/components/Decks/CardFan";
import { DEFAULT_DECK_FAN_PREVIEW_COUNT } from "@/components/Decks/deck-fan.constants";
import DeckExportButton from "@/components/Decks/DeckExportButton";
import { useI18n } from "@/i18n/I18nProvider";

export default function DeckDetailHeader({
  deckId,
  deckTitle,
  deckPreviewCardIds = [],
}: {
  deckId: string | null;
  deckTitle: string;
  deckPreviewCardIds?: string[];
}) {
  const { t } = useI18n();
  return (
    <div className={styles.deckRouteToolbar}>
      <div className={styles.deckBreadcrumbTitleWithFan}>
        <span className={styles.deckBreadcrumbFan} aria-hidden="true">
          <CardFan
            cardIds={deckPreviewCardIds}
            variant="xs"
            maxCount={DEFAULT_DECK_FAN_PREVIEW_COUNT}
            showPlaceholdersWhenEmpty
            emptyPlaceholderVariant="deck-empty"
            spacing={0.65}
            tilt={0.55}
          />
        </span>
        <span className={styles.deckBreadcrumbTitle}>{deckTitle}</span>
      </div>
      <div className={styles.deckHeaderActions}>
        <DeckExportButton
          deckId={deckId}
          scope="deck_detail"
          disabled={!deckId}
          label={t("actions.export")}
          className="btn btn-outline-light btn-sm"
        />
      </div>
    </div>
  );
}
