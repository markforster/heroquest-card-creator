"use client";

import { useEffect, useMemo, useRef } from "react";

import styles from "@/app/page.module.css";
import type { RouteShortcutHandlers } from "@/components/App/RouteShellCapabilitiesContext";
import CardFan from "@/components/Decks/CardFan";
import { DEFAULT_DECK_FAN_PREVIEW_COUNT } from "@/components/Decks/deck-fan.constants";
import DeckExportButton, { type DeckExportButtonHandle } from "@/components/Decks/DeckExportButton";
import { useI18n } from "@/i18n/I18nProvider";

export default function DeckDetailHeader({
  deckId,
  deckTitle,
  deckPreviewCardIds = [],
  onRouteShortcutHandlersReady,
}: {
  deckId: string | null;
  deckTitle: string;
  deckPreviewCardIds?: string[];
  onRouteShortcutHandlersReady?: (handlers: RouteShortcutHandlers | null) => void;
}) {
  const { t } = useI18n();
  const exportButtonRef = useRef<DeckExportButtonHandle | null>(null);
  const routeShortcutHandlers = useMemo<RouteShortcutHandlers>(
    () => ({
      e: () => {
        if (!deckId) return false;
        return exportButtonRef.current?.toggleMenu() ?? false;
      },
      i: async () => {
        if (!deckId || !exportButtonRef.current?.isMenuOpen()) return false;
        return exportButtonRef.current.runImageExport();
      },
      p: async () => {
        if (!deckId || !exportButtonRef.current?.isMenuOpen()) return false;
        return exportButtonRef.current.runPdfExport();
      },
    }),
    [deckId],
  );

  useEffect(() => {
    if (!onRouteShortcutHandlersReady || !deckId) return;
    onRouteShortcutHandlersReady(routeShortcutHandlers);
    return () => onRouteShortcutHandlersReady(null);
  }, [deckId, onRouteShortcutHandlersReady, routeShortcutHandlers]);

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
          ref={exportButtonRef}
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
