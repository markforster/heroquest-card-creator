"use client";

import { useState } from "react";

import AssetsModal from "@/components/Assets/AssetsModal";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import ConfirmModal from "@/components/ConfirmModal";
import MainHeader from "@/components/MainHeader";
import StatLabelOverridesModal from "@/components/StatLabelOverridesModal";
import { StockpileModal } from "@/components/Stockpile";
import TemplatePicker from "@/components/TemplatePicker";
import { cardTemplatesById } from "@/data/card-templates";
import { usePopupState } from "@/hooks/usePopupState";
import { getCard } from "@/lib/cards-db";
import type { TemplateId } from "@/types/templates";

export default function HeaderWithTemplatePicker() {
  const {
    state: { selectedTemplateId, activeCardIdByTemplate, isDirtyByTemplate },
    setSelectedTemplateId,
    loadCardIntoEditor,
  } = useCardEditor();

  const templatePicker = usePopupState(false);
  const assetsModal = usePopupState(false);
  const stockpileModal = usePopupState(false);
  const settingsModal = usePopupState(false);
  const [stockpileRefreshToken, setStockpileRefreshToken] = useState(0);
  const [pendingCard, setPendingCard] = useState<Awaited<ReturnType<typeof getCard>> | null>(null);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  const selectedTemplate = selectedTemplateId ? cardTemplatesById[selectedTemplateId] : undefined;
  const currentTemplateId = selectedTemplateId ?? null;
  const activeCardId =
    currentTemplateId != null ? activeCardIdByTemplate[currentTemplateId] : undefined;

  const handleLoadCard = async (card: Awaited<ReturnType<typeof getCard>> | null) => {
    if (!card) return;
    try {
      const fresh = await getCard(card.id);
      const record = fresh ?? card;
      setSelectedTemplateId(record.templateId as TemplateId);
      loadCardIntoEditor(record.templateId as TemplateId, record);
      setStockpileRefreshToken((prev) => prev + 1);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[HeaderWithTemplatePicker] Failed to load card", error);
    }
  };

  return (
    <>
      <MainHeader
        hasTemplate={Boolean(selectedTemplateId)}
        currentTemplateName={selectedTemplate?.name}
        onOpenTemplatePicker={() => {
          if (!selectedTemplateId) return;
          templatePicker.open();
        }}
        onOpenAssets={assetsModal.open}
        onOpenStockpile={stockpileModal.open}
        onOpenSettings={settingsModal.open}
      />
      <TemplatePicker
        isOpen={templatePicker.isOpen}
        currentTemplateId={selectedTemplateId}
        onApply={(templateId) => {
          setSelectedTemplateId(templateId as TemplateId | null);
        }}
        onClose={templatePicker.close}
      />
      <AssetsModal isOpen={assetsModal.isOpen} onClose={assetsModal.close} mode="manage" />
      <StatLabelOverridesModal
        isOpen={settingsModal.isOpen}
        onClose={settingsModal.close}
      />
      <StockpileModal
        isOpen={stockpileModal.isOpen}
        onClose={stockpileModal.close}
        refreshToken={stockpileRefreshToken}
        activeCardId={activeCardId ?? null}
        onLoadCard={async (card) => {
          const currentTemplate = selectedTemplateId;
          const dirty =
            currentTemplate != null && Boolean(isDirtyByTemplate[currentTemplate as TemplateId]);
          if (dirty) {
            setPendingCard(card);
            setIsDiscardConfirmOpen(true);
            return;
          }
          await handleLoadCard(card);
        }}
      />
      <ConfirmModal
        isOpen={isDiscardConfirmOpen}
        title="Discard changes?"
        confirmLabel="Discard"
        onConfirm={async () => {
          setIsDiscardConfirmOpen(false);
          const card = pendingCard;
          setPendingCard(null);
          await handleLoadCard(card);
        }}
        onCancel={() => {
          setIsDiscardConfirmOpen(false);
          setPendingCard(null);
        }}
      >
        You have unsaved changes on the current card. Load another card and discard these changes?
      </ConfirmModal>
    </>
  );
}
