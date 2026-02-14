"use client";

import { createContext, useContext, useMemo, useState } from "react";

import AssetsModal from "@/components/Assets/AssetsModal";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import ConfirmModal from "@/components/ConfirmModal";
import RecentCardsModal from "@/components/RecentCardsModal";
import SettingsModal from "@/components/SettingsModal/SettingsModal";
import { StockpileModal } from "@/components/Stockpile";
import TemplatePicker from "@/components/TemplatePicker";
import { cardTemplatesById } from "@/data/card-templates";
import { usePopupState } from "@/hooks/usePopupState";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { getCard, touchCardLastViewed } from "@/lib/cards-db";
import { createDefaultCardData } from "@/types/card-data";
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
  const {
    state: { selectedTemplateId, activeCardIdByTemplate, isDirtyByTemplate },
    setSelectedTemplateId,
    setSingleDraft,
    setActiveCard,
    setTemplateDirty,
    loadCardIntoEditor,
  } = useCardEditor();

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
  const [pendingCard, setPendingCard] = useState<Awaited<ReturnType<typeof getCard>> | null>(null);
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

  const handleLoadCard = async (card: Awaited<ReturnType<typeof getCard>> | null) => {
    if (!card) return;
    try {
      const fresh = await getCard(card.id);
      const record = fresh ?? card;
      const viewed = await touchCardLastViewed(record.id);
      const nextRecord = viewed ?? record;
      setSelectedTemplateId(nextRecord.templateId as TemplateId);
      loadCardIntoEditor(nextRecord.templateId as TemplateId, nextRecord);
      setStockpileRefreshToken((prev) => prev + 1);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[AppActionsProvider] Failed to load card", error);
    }
  };

  const contextValue = useMemo(
    () => ({
      hasTemplate: Boolean(selectedTemplateId),
      currentTemplateName,
      openTemplatePicker: () => {
        const currentTemplate = selectedTemplateId;
        const dirty =
          currentTemplate != null && Boolean(isDirtyByTemplate[currentTemplate as TemplateId]);
        if (dirty) {
          setPendingNewTemplate(true);
          setIsDiscardConfirmOpen(true);
          return;
        }
        templatePicker.open();
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
        stockpileModal.open();
      },
      openRecent: recentModal.open,
      openSettings: settingsModal.open,
      isTemplatePickerOpen: templatePicker.isOpen,
      isAssetsOpen: assetsModal.isOpen,
      isStockpileOpen: stockpileModal.isOpen,
      isRecentOpen: recentModal.isOpen,
      isSettingsOpen: settingsModal.isOpen,
    }),
    [
      assetsModal.open,
      assetsModal.isOpen,
      currentTemplateName,
      selectedTemplateId,
      isDirtyByTemplate,
      settingsModal.open,
      settingsModal.isOpen,
      stockpileModal.open,
      stockpileModal.isOpen,
      recentModal.open,
      recentModal.isOpen,
      templatePicker.isOpen,
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
          const nextDraft = createDefaultCardData(nextTemplateId);
          setSelectedTemplateId(nextTemplateId);
          setSingleDraft(nextTemplateId, nextDraft);
          setActiveCard(nextTemplateId, null, null);
          setTemplateDirty(nextTemplateId, false);
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
          const currentTemplate = selectedTemplateId;
          const dirty =
            currentTemplate != null && Boolean(isDirtyByTemplate[currentTemplate as TemplateId]);
          if (dirty) {
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
          const currentTemplate = selectedTemplateId;
          const dirty =
            currentTemplate != null && Boolean(isDirtyByTemplate[currentTemplate as TemplateId]);
          if (dirty) {
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
