"use client";

import { ChevronRight, Plus } from "lucide-react";

import styles from "@/app/page.module.css";
import DeckExportButton from "@/components/Decks/DeckExportButton";
import { useDeckRightPanel } from "@/components/Decks/detail/context/DeckRightPanelContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function DeckDetailHeader({
  deckId,
  deckTitle,
}: {
  deckId: string | null;
  deckTitle: string;
}) {
  const { t } = useI18n();
  const { isRightPanelVisible, toggleRightPanel } = useDeckRightPanel();
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
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={toggleRightPanel}
          title={t("decks.sourcePanelToggle")}
          aria-label={t("decks.sourcePanelToggle")}
        >
          {isRightPanelVisible ? <ChevronRight size={16} /> : <Plus size={16} />}
        </button>
      </div>
    </div>
  );
}
