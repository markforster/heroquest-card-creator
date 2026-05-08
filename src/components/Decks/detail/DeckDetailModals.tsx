"use client";

import ConfirmModal from "@/components/Modals/ConfirmModal";
import type { DeckDetailModalActions, DeckDetailModalState } from "@/components/Decks/types/deck-detail";
import { useI18n } from "@/i18n/I18nProvider";

export default function DeckDetailModals({
  deckId,
  state,
  actions,
  onDeleteDeck,
  onDeleteSet,
  onDeleteGroup,
  onRebuildConfirm,
  onNavigateToDecks,
}: {
  deckId: string | null;
  state: DeckDetailModalState;
  actions: DeckDetailModalActions;
  onDeleteDeck: (deckId: string) => Promise<void>;
  onDeleteSet: () => Promise<void>;
  onDeleteGroup: () => Promise<void>;
  onRebuildConfirm: () => void;
  onNavigateToDecks: () => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <ConfirmModal
        isOpen={state.isDeleteDeckOpen}
        title={t("decks.deleteDeckTitle")}
        confirmLabel={t("actions.delete")}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          if (!deckId) return;
          actions.setIsDeleteDeckOpen(false);
          await onDeleteDeck(deckId);
          onNavigateToDecks();
        }}
        onCancel={() => actions.setIsDeleteDeckOpen(false)}
      >
        <div>{t("decks.deleteDeckBody")}</div>
      </ConfirmModal>
      <ConfirmModal
        isOpen={state.isDeleteSetOpen}
        title={t("decks.deleteSetTitle")}
        confirmLabel={t("actions.delete")}
        cancelLabel={t("actions.cancel")}
        onConfirm={onDeleteSet}
        onCancel={() => {
          actions.setPendingDeleteSet(null);
          actions.setIsDeleteSetOpen(false);
        }}
      >
        <div>{t("decks.deleteSetBody")}</div>
      </ConfirmModal>
      <ConfirmModal
        isOpen={state.isDeleteGroupOpen}
        title={t("decks.deleteGroupTitle")}
        confirmLabel={t("actions.delete")}
        cancelLabel={t("actions.cancel")}
        onConfirm={onDeleteGroup}
        onCancel={() => {
          actions.setPendingDeleteGroup(null);
          actions.setIsDeleteGroupOpen(false);
        }}
      >
        <div>{t("decks.deleteGroupBody")}</div>
      </ConfirmModal>
      <ConfirmModal
        isOpen={state.isRebuildConfirmOpen}
        title={t("decks.changeBackConfirmTitle")}
        confirmLabel={t("actions.confirm")}
        cancelLabel={t("actions.cancel")}
        onConfirm={onRebuildConfirm}
        onCancel={() => {
          actions.setIsRebuildConfirmOpen(false);
          actions.setPendingRebuildSetId(null);
        }}
      >
        <div>{t("decks.changeBackConfirmBody")}</div>
      </ConfirmModal>
    </>
  );
}
