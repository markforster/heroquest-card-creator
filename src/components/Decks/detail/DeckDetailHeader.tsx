"use client";

import { ChevronRight, Plus } from "lucide-react";

import styles from "@/app/page.module.css";
import { useDeckRightPanel } from "@/components/Decks/detail/context/DeckRightPanelContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function DeckDetailHeader({
  deckTitle,
}: {
  deckTitle: string;
}) {
  const { t } = useI18n();
  const { isRightPanelVisible, toggleRightPanel } = useDeckRightPanel();
  return (
    <div className={styles.deckRouteToolbar}>
      <div className={styles.deckBreadcrumbTitle}>{deckTitle}</div>
      <div className={styles.deckHeaderActions}>
        <button
          type="button"
          className={styles.deckIconButton}
          onClick={toggleRightPanel}
          title={t("decks.sourcePanelToggle")}
        >
          {isRightPanelVisible ? <ChevronRight size={16} /> : <Plus size={16} />}
        </button>
      </div>
    </div>
  );
}
