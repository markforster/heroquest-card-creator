"use client";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import styles from "@/app/page.module.css";
import DeckFanByDeckId from "@/components/Decks/DeckFanByDeckId";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { buildDeckDeepLink } from "@/components/Decks/deckDeepLink";
import { useI18n } from "@/i18n/I18nProvider";
import { apiClient } from "@/api/client";
import type { CardDeckMembership } from "@/api/cards";

export default function DecksInspectorPanel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate, activeCardStatusByTemplate },
  } = useCardEditor();

  const activeCardId = selectedTemplateId ? activeCardIdByTemplate[selectedTemplateId] : undefined;
  const activeCardStatus = selectedTemplateId
    ? activeCardStatusByTemplate[selectedTemplateId]
    : undefined;
  const savedCardId = activeCardId && activeCardStatus === "saved" ? activeCardId : null;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [memberships, setMemberships] = useState<CardDeckMembership[]>([]);

  const heading = useMemo(() => t("heading.decksForCard"), [t]);

  useEffect(() => {
    let cancelled = false;

    const loadDecks = async () => {
      if (!savedCardId) {
        setMemberships([]);
        setIsLoading(false);
        setError(false);
        return;
      }

      setIsLoading(true);
      setError(false);
      try {
        const data = await apiClient.listCardDecks({ params: { id: savedCardId } });
        if (cancelled) return;
        setMemberships(data);
      } catch {
        if (cancelled) return;
        setMemberships([]);
        setError(true);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDecks();

    return () => {
      cancelled = true;
    };
  }, [savedCardId]);

  if (!savedCardId) {
    return <div className={styles.inspectorModeEmpty}>{t("empty.saveCardToViewDecks")}</div>;
  }

  return (
    <div className="d-flex flex-column gap-2">
      <div className="small text-uppercase text-muted fw-semibold">{heading}</div>
      {isLoading ? <div className={styles.inspectorModeEmpty}>{t("status.loadingDecks")}</div> : null}
      {!isLoading && error ? (
        <div className={styles.inspectorModeEmpty}>{t("error.failedToLoadDecks")}</div>
      ) : null}
      {!isLoading && !error && memberships.length === 0 ? (
        <div className={styles.inspectorModeEmpty}>{t("empty.cardNotInDecks")}</div>
      ) : null}
      {!isLoading && !error && memberships.length > 0 ? (
        <div className="list-group" data-testid="decks-inspector-list">
          {memberships.map((membership) => (
            <button
              key={membership.deckId}
              type="button"
              className={`list-group-item list-group-item-action ${styles.inspectorDeckMembershipRow}`}
              onClick={() =>
                navigate(
                  buildDeckDeepLink({
                    deckId: membership.deckId,
                    setId: membership.setId,
                    entryId: membership.entryId,
                  }),
                )
              }
            >
              <span className={styles.inspectorDeckMembershipFan}>
                <DeckFanByDeckId
                  deckId={membership.deckId}
                  maxCount={6}
                  variant="inspector"
                  spacing={0.7}
                  tilt={0.5}
                  showPlaceholdersWhenEmpty
                  emptyPlaceholderVariant="deck-empty"
                />
              </span>
              <span className={styles.inspectorDeckMembershipTitle}>{membership.deckTitle}</span>
              <span className={styles.inspectorDeckMembershipCount}>{membership.count}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
