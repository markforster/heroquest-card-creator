"use client";

import styles from "@/app/page.module.css";
import DeckExportButton from "@/components/Decks/DeckExportButton";
import { useI18n } from "@/i18n/I18nProvider";

export default function DeckDetailHeader({
  deckId,
  deckTitle,
}: {
  deckId: string | null;
  deckTitle: string;
}) {
  const { t } = useI18n();
  return (
    <div className={styles.deckRouteToolbar}>
      <div className={styles.deckBreadcrumbTitle}>{deckTitle}</div>
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
