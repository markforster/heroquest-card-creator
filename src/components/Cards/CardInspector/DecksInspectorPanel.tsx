"use client";

import { CircleAlert, Info, Layers, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import styles from "@/app/page.module.css";
import DeckFanByDeckId from "@/components/Decks/DeckFanByDeckId";
import { DEFAULT_DECK_FAN_PREVIEW_COUNT } from "@/components/Decks/deck-fan.constants";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { buildDeckDeepLink } from "@/components/Decks/deckDeepLink";
import { useI18n } from "@/i18n/I18nProvider";
import { apiClient } from "@/api/client";
import type { CardDeckMembership } from "@/api/cards";
import InspectorEntityRow from "./InspectorEntityRow";
import InspectorStateNotice from "./InspectorStateNotice";

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
    return (
      <InspectorStateNotice
        variant="prerequisite"
        icon={<Info size={18} aria-hidden="true" />}
        title={t("empty.saveCardToViewDecksTitle")}
        body={t("empty.saveCardToViewDecksBody")}
        hint={t("empty.saveCardToViewDecksHint")}
      />
    );
  }

  return (
    <div className="d-flex flex-column gap-2">
      {isLoading ? (
        <InspectorStateNotice
          variant="loading"
          icon={<LoaderCircle size={18} aria-hidden="true" />}
          title={t("status.loadingDecks")}
          body={t("status.loadingDecksBody")}
        />
      ) : null}
      {!isLoading && error ? (
        <InspectorStateNotice
          variant="error"
          icon={<CircleAlert size={18} aria-hidden="true" />}
          title={t("error.failedToLoadDecks")}
          body={t("error.failedToLoadDecksBody")}
          role="alert"
        />
      ) : null}
      {!isLoading && !error && memberships.length === 0 ? (
        <InspectorStateNotice
          icon={<Layers size={18} aria-hidden="true" />}
          title={t("empty.cardNotInDecksTitle")}
          body={t("empty.cardNotInDecksBody")}
          hint={t("empty.cardNotInDecksHint")}
        />
      ) : null}
      {!isLoading && !error && memberships.length > 0 ? (
        <div className="d-flex flex-column gap-2" data-testid="decks-inspector-list">
          {memberships.map((membership) => (
            <InspectorEntityRow
              key={membership.deckId}
              as="button"
              interactive
              className={styles.inspectorDeckMembershipRow}
              title={membership.deckTitle}
              subtitle={undefined}
              right={<span className={styles.inspectorDeckMembershipCount}>{membership.count}</span>}
              onClick={() =>
                navigate(
                  buildDeckDeepLink({
                    deckId: membership.deckId,
                    setId: membership.setId,
                    entryId: membership.entryId,
                  }),
                )
              }
              left={
                <span className={styles.inspectorDeckMembershipFan}>
                  <DeckFanByDeckId
                    deckId={membership.deckId}
                    maxCount={DEFAULT_DECK_FAN_PREVIEW_COUNT}
                    variant="inspector"
                    className={styles.inspectorDeckMembershipFanInner}
                    spacing={0.7}
                    tilt={0.5}
                    showPlaceholdersWhenEmpty
                    emptyPlaceholderVariant="deck-empty"
                  />
                </span>
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
