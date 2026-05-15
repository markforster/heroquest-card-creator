"use client";

import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import DeckExportButton from "@/components/Decks/DeckExportButton";
import { useDeckRightPanel } from "@/components/Decks/detail/context/DeckRightPanelContext";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useI18n } from "@/i18n/I18nProvider";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

export default function DeckDetailHeader({
  deckId,
  deckTitle,
  selectedSetId,
  keySetId,
  selectedSetBackFaceId,
  onConfirmMakeKeyCard,
}: {
  deckId: string | null;
  deckTitle: string;
  selectedSetId: string | null;
  keySetId: string | null;
  selectedSetBackFaceId: string | null;
  onConfirmMakeKeyCard: () => Promise<void>;
}) {
  const { t } = useI18n();
  const { isRightPanelVisible, toggleRightPanel } = useDeckRightPanel();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const selectedBackThumbUrl = useCardThumbnailUrl(selectedSetBackFaceId, null, {
    enabled: Boolean(selectedSetBackFaceId),
    useCache: true,
  });
  const canMakeKey = Boolean(selectedSetId && selectedSetId !== keySetId);
  return (
    <>
      <div className={styles.deckRouteToolbar}>
        <div className={styles.deckBreadcrumbTitle}>{deckTitle}</div>
        <div className={styles.deckHeaderActions}>
          <button
            type="button"
            className="btn btn-outline-light btn-sm"
            disabled={!canMakeKey}
            onClick={() => setIsConfirmOpen(true)}
          >
            Make Key Card
          </button>
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
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Make Key Card"
        confirmLabel={t("actions.confirm")}
        cancelLabel={t("actions.cancel")}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={async () => {
          await onConfirmMakeKeyCard();
          setIsConfirmOpen(false);
        }}
      >
        <div className={styles.deckKeyCardConfirmBody}>
          <div className={styles.deckKeyCardConfirmThumb}>
            <CardThumbnail
              src={selectedBackThumbUrl}
              alt=""
              variant="lg"
              fit="cover"
              fallback={<div className={styles.deckSetThumbFallback} />}
            />
          </div>
          <div>Set this back face as the key card for this deck?</div>
        </div>
      </ConfirmModal>
    </>
  );
}
