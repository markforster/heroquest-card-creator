"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormState } from "react-hook-form";

import AssetsModal from "@/components/Assets/AssetsModal";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import RecentCardsModal from "@/components/Modals/RecentCardsModal";
import SettingsModal from "@/components/Modals/SettingsModal/SettingsModal";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useEditorForm } from "@/components/Providers/EditorFormContext";
import { StockpileModal } from "@/components/Stockpile";
import TemplatePicker from "@/components/TemplatePicker";
import { cardTemplatesById } from "@/data/card-templates";
import { usePopupState } from "@/hooks/usePopupState";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import type { CardRecord } from "@/api/cards";
import { createEditorDefaultValues } from "@/lib/editor-form";
import type { TemplateId } from "@/types/templates";

type StockpileOpenOptions = {
  mode?: "manage" | "pair-fronts" | "pair-backs";
  onConfirmSelection?: (cardIds: string[]) => void;
  initialSelectedIds?: string[];
  titleOverride?: string;
};

type AppActionsContextValue = {
  hasTemplate: boolean;
  currentTemplateName?: string;
  openTemplatePicker: () => void;
  openAssets: () => void;
  openStockpile: (options?: StockpileOpenOptions) => void;
  openRecent: () => void;
  openSettings: () => void;
  isTemplatePickerOpen: boolean;
  isAssetsOpen: boolean;
  isStockpileOpen: boolean;
  isRecentOpen: boolean;
  isSettingsOpen: boolean;
};

const AppActionsContext = createContext<AppActionsContextValue | null>(null);

export function useAppActions() {
  const context = useContext(AppActionsContext);
  if (!context) {
    throw new Error("useAppActions must be used within AppActionsProvider");
  }
  return context;
}

type AppActionsProviderProps = {
  children: React.ReactNode;
};

export function AppActionsProvider({ children }: AppActionsProviderProps) {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const { track } = useAnalytics();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
    setSelectedTemplateId,
    setActiveCard,
  } = useCardEditor();
  const { methods, resetWithSaved } = useEditorForm();
  const { isDirty } = useFormState({ control: methods.control });

  const templatePicker = usePopupState(false);
  const assetsModal = usePopupState(false);
  const stockpileModal = usePopupState(false);
  const recentModal = usePopupState(false);
  const [stockpileMode, setStockpileMode] = useState<"manage" | "pair-fronts" | "pair-backs">(
    "manage",
  );
  const [stockpileConfirmHandler, setStockpileConfirmHandler] = useState<
    ((cardIds: string[]) => void) | null
  >(null);
  const [stockpileInitialSelectedIds, setStockpileInitialSelectedIds] = useState<string[]>([]);
  const [stockpileTitleOverride, setStockpileTitleOverride] = useState<string | null>(null);
  const settingsModal = usePopupState(false);
  const [stockpileRefreshToken, setStockpileRefreshToken] = useState(0);
  const [pendingCard, setPendingCard] = useState<CardRecord | null>(null);
  const [pendingCardSource, setPendingCardSource] = useState<"stockpile" | "recent" | null>(null);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [pendingNewTemplate, setPendingNewTemplate] = useState(false);

  const selectedTemplate = selectedTemplateId ? cardTemplatesById[selectedTemplateId] : undefined;
  const currentTemplateName = selectedTemplate
    ? getTemplateNameLabel(language, selectedTemplate)
    : undefined;
  const currentTemplateId = selectedTemplateId ?? null;
  const activeCardId =
    currentTemplateId != null ? activeCardIdByTemplate[currentTemplateId] : undefined;

  const handleLoadCard = async (card: CardRecord | null) => {
    if (!card) return;
    navigate(`/cards/${card.id}`);
    setStockpileRefreshToken((prev) => prev + 1);
  };

  const templatePickerOpen = templatePicker.open;
  const templatePickerIsOpen = templatePicker.isOpen;
  const stockpileModalOpen = stockpileModal.open;
  const stockpileModalIsOpen = stockpileModal.isOpen;

  const contextValue = useMemo(
    () => ({
      hasTemplate: Boolean(selectedTemplateId),
      currentTemplateName,
      openTemplatePicker: () => {
        if (isDirty) {
          setPendingNewTemplate(true);
          setIsDiscardConfirmOpen(true);
          return;
        }
        templatePickerOpen();
      },
      openAssets: assetsModal.open,
      openStockpile: (options?: StockpileOpenOptions) => {
        if (options?.mode) {
          setStockpileMode(options.mode);
        } else {
          setStockpileMode("manage");
        }
        setStockpileConfirmHandler(() => options?.onConfirmSelection ?? null);
        setStockpileInitialSelectedIds(options?.initialSelectedIds ?? []);
        setStockpileTitleOverride(options?.titleOverride ?? null);
        stockpileModalOpen();
      },
      openRecent: recentModal.open,
      openSettings: settingsModal.open,
      isTemplatePickerOpen: templatePickerIsOpen,
      isAssetsOpen: assetsModal.isOpen,
      isStockpileOpen: stockpileModalIsOpen,
      isRecentOpen: recentModal.isOpen,
      isSettingsOpen: settingsModal.isOpen,
    }),
    [
      assetsModal.open,
      assetsModal.isOpen,
      currentTemplateName,
      selectedTemplateId,
      settingsModal.open,
      settingsModal.isOpen,
      stockpileModalOpen,
      stockpileModalIsOpen,
      recentModal.open,
      recentModal.isOpen,
      templatePickerOpen,
      templatePickerIsOpen,
      isDirty,
    ],
  );

  return (
    <AppActionsContext.Provider value={contextValue}>
      {children}
      <TemplatePicker
        isOpen={templatePicker.isOpen}
        currentTemplateId={selectedTemplateId}
        onApply={(templateId) => {
          const nextTemplateId = templateId as TemplateId;
          track("template_selected", {
            template_id: nextTemplateId,
            source: "template_picker",
          });
          const nextDraft = createEditorDefaultValues(nextTemplateId);
          setSelectedTemplateId(nextTemplateId);
          resetWithSaved(nextDraft);
          setActiveCard(nextTemplateId, null, null);
          navigate("/cards/new");
        }}
        onClose={templatePicker.close}
      />
      <AssetsModal isOpen={assetsModal.isOpen} onClose={assetsModal.close} mode="manage" />
      <SettingsModal isOpen={settingsModal.isOpen} onClose={settingsModal.close} />
      <StockpileModal
        isOpen={stockpileModal.isOpen}
        onClose={() => {
          stockpileModal.close();
          setStockpileMode("manage");
          setStockpileConfirmHandler(null);
          setStockpileInitialSelectedIds([]);
          setStockpileTitleOverride(null);
        }}
        refreshToken={stockpileRefreshToken}
        activeCardId={activeCardId ?? null}
        mode={stockpileMode}
        initialSelectedIds={stockpileInitialSelectedIds}
        titleOverride={stockpileTitleOverride ?? undefined}
        onConfirmSelection={
          stockpileMode === "pair-fronts" || stockpileMode === "pair-backs"
            ? (stockpileConfirmHandler ?? undefined)
            : undefined
        }
        onLoadCard={async (card) => {
          if (isDirty) {
            setPendingCard(card);
            setPendingCardSource("stockpile");
            setIsDiscardConfirmOpen(true);
            return;
          }
          await handleLoadCard(card);
        }}
      />
      <RecentCardsModal
        isOpen={recentModal.isOpen}
        onClose={recentModal.close}
        onSelectCard={(card) => {
          if (isDirty) {
            setPendingCard(card);
            setPendingCardSource("recent");
            setIsDiscardConfirmOpen(true);
            return false;
          }
          void handleLoadCard(card);
          return true;
        }}
      />
      <ConfirmModal
        isOpen={isDiscardConfirmOpen}
        title={t("heading.discardChanges")}
        confirmLabel={t("actions.discard")}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          setIsDiscardConfirmOpen(false);
          const card = pendingCard;
          const source = pendingCardSource;
          setPendingCard(null);
          setPendingCardSource(null);
          if (pendingNewTemplate) {
            setPendingNewTemplate(false);
            templatePicker.open();
            return;
          }
          await handleLoadCard(card);
          if (source === "recent") {
            recentModal.close();
          }
        }}
        onCancel={() => {
          setIsDiscardConfirmOpen(false);
          setPendingCard(null);
          setPendingCardSource(null);
          setPendingNewTemplate(false);
        }}
      >
        {t("confirm.discardChangesBody")}
      </ConfirmModal>
    </AppActionsContext.Provider>
  );
}
