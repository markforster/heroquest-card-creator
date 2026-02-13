"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import ConfirmModal from "@/components/ConfirmModal";
import { formatMessage } from "@/components/Stockpile/stockpile-utils";
import { useI18n } from "@/i18n/I18nProvider";

import type { ReactNode } from "react";

export type SettingsPanelApi = {
  setBlocked: (blocked: boolean, reason?: string) => void;
  setPanelLabel: (label: string) => void;
  setSaveHandler: (handler?: () => void | Promise<void>) => void;
  setBeforeClose: (handler?: () => void | Promise<void>) => void;
  canClose: () => boolean;
  requestClose: () => void;
  requestAreaChange: (nextAreaId: string) => void;
};

type PanelState = {
  blocked: boolean;
  reason?: string;
  label?: string;
  saveHandler?: () => void | Promise<void>;
  beforeClose?: () => void | Promise<void>;
};

type PendingAction =
  | { type: "close" }
  | { type: "switch"; nextAreaId: string };

type SettingsModalContextValue = {
  registerPanel: (panelId: string) => void;
  unregisterPanel: (panelId: string) => void;
  setBlocked: (panelId: string, blocked: boolean, reason?: string) => void;
  setPanelLabel: (panelId: string, label: string) => void;
  setSaveHandler: (panelId: string, handler?: () => void | Promise<void>) => void;
  setBeforeClose: (panelId: string, handler?: () => void | Promise<void>) => void;
  canClose: () => boolean;
  requestClose: () => void;
  requestAreaChange: (nextAreaId: string) => void;
};

type SettingsPanelContextValue = {
  panelId: string;
};

const SettingsModalContext = createContext<SettingsModalContextValue | null>(null);
const SettingsPanelContext = createContext<SettingsPanelContextValue | null>(null);

function useSettingsModalContext(): SettingsModalContextValue {
  const ctx = useContext(SettingsModalContext);
  if (!ctx) {
    throw new Error("SettingsModalContext is missing");
  }
  return ctx;
}

function useSettingsPanelContext(): SettingsPanelContextValue {
  const ctx = useContext(SettingsPanelContext);
  if (!ctx) {
    throw new Error("SettingsPanelContext is missing");
  }
  return ctx;
}

type SettingsModalProviderProps = {
  children: ReactNode;
  onClose: () => void;
  onAreaChange: (nextAreaId: string) => void;
};

export function SettingsModalProvider({
  children,
  onClose,
  onAreaChange,
}: SettingsModalProviderProps) {
  const { t } = useI18n();
  const panelsRef = useRef<Map<string, PanelState>>(new Map());
  const [confirmAction, setConfirmAction] = useState<PendingAction | null>(null);
  const [confirmReason, setConfirmReason] = useState<string | null>(null);
  const [, forceRender] = useState(0);
  const formatMessageWith = useCallback(
    (key: string, vars: Record<string, string | number>) =>
      formatMessage(t(key), vars),
    [t],
  );

  const registerPanel = useCallback((panelId: string) => {
    if (!panelsRef.current.has(panelId)) {
      panelsRef.current.set(panelId, { blocked: false });
      forceRender((value) => value + 1);
    }
  }, []);

  const unregisterPanel = useCallback((panelId: string) => {
    if (panelsRef.current.delete(panelId)) {
      forceRender((value) => value + 1);
    }
  }, []);

  const setBlocked = useCallback((panelId: string, blocked: boolean, reason?: string) => {
    const panel = panelsRef.current.get(panelId);
    if (!panel) return;
    panel.blocked = blocked;
    panel.reason = reason;
    forceRender((value) => value + 1);
  }, []);

  const setPanelLabel = useCallback((panelId: string, label: string) => {
    const panel = panelsRef.current.get(panelId);
    if (!panel) return;
    panel.label = label;
  }, []);

  const setSaveHandler = useCallback(
    (panelId: string, handler?: () => void | Promise<void>) => {
      const panel = panelsRef.current.get(panelId);
      if (!panel) return;
      panel.saveHandler = handler;
    },
    [],
  );

  const setBeforeClose = useCallback(
    (panelId: string, handler?: () => void | Promise<void>) => {
      const panel = panelsRef.current.get(panelId);
      if (!panel) return;
      panel.beforeClose = handler;
    },
    [],
  );

  const getBlockedPanel = useCallback(() => {
    for (const panel of panelsRef.current.values()) {
      if (panel.blocked) {
        return panel;
      }
    }
    return null;
  }, []);

  const canClose = useCallback(() => !getBlockedPanel(), [getBlockedPanel]);

  const runBeforeClose = useCallback(async () => {
    const handlers = Array.from(panelsRef.current.values())
      .map((panel) => panel.beforeClose)
      .filter((handler): handler is () => void | Promise<void> => Boolean(handler));

    for (const handler of handlers) {
      await handler();
    }
  }, []);

  const performClose = useCallback(async () => {
    await runBeforeClose();
    onClose();
  }, [onClose, runBeforeClose]);

  const requestClose = useCallback(() => {
    const blockedPanel = getBlockedPanel();
    if (blockedPanel) {
      setConfirmAction({ type: "close" });
      setConfirmReason(
        blockedPanel.label
          ? formatMessageWith("confirm.discardSettingsChangesPanel", {
              panel: blockedPanel.label,
            })
          : blockedPanel.reason ?? t("confirm.discardSettingsChangesBody"),
      );
      return;
    }
    void performClose();
  }, [getBlockedPanel, performClose, t]);

  const requestAreaChange = useCallback(
    (nextAreaId: string) => {
      const blockedPanel = getBlockedPanel();
      if (blockedPanel) {
        setConfirmAction({ type: "switch", nextAreaId });
        setConfirmReason(
          blockedPanel.label
            ? formatMessageWith("confirm.discardSettingsChangesPanel", {
                panel: blockedPanel.label,
              })
            : blockedPanel.reason ?? t("confirm.discardSettingsChangesBody"),
        );
        return;
      }
      onAreaChange(nextAreaId);
    },
    [getBlockedPanel, onAreaChange, t],
  );

  const handleConfirm = useCallback(async () => {
    const action = confirmAction;
    setConfirmAction(null);
    setConfirmReason(null);
    if (!action) return;

    if (action.type === "close") {
      await performClose();
      return;
    }

    if (action.type === "switch") {
      onAreaChange(action.nextAreaId);
    }
  }, [confirmAction, onAreaChange, performClose]);

  const [isSaving, setIsSaving] = useState(false);
  const handleSave = useCallback(async () => {
    const action = confirmAction;
    if (!action) return;
    const blockedPanel = getBlockedPanel();
    if (!blockedPanel?.saveHandler) return;
    setIsSaving(true);
    try {
      await blockedPanel.saveHandler();
      setConfirmAction(null);
      setConfirmReason(null);
      if (action.type === "close") {
        await performClose();
        return;
      }
      if (action.type === "switch") {
        onAreaChange(action.nextAreaId);
      }
    } finally {
      setIsSaving(false);
    }
  }, [confirmAction, getBlockedPanel, onAreaChange, performClose]);

  const handleCancel = useCallback(() => {
    setConfirmAction(null);
    setConfirmReason(null);
  }, []);

  const contextValue = useMemo<SettingsModalContextValue>(
    () => ({
      registerPanel,
      unregisterPanel,
      setBlocked,
      setPanelLabel,
      setSaveHandler,
      setBeforeClose,
      canClose,
      requestClose,
      requestAreaChange,
    }),
    [
      registerPanel,
      unregisterPanel,
      setBlocked,
      setPanelLabel,
      setSaveHandler,
      setBeforeClose,
      canClose,
      requestClose,
      requestAreaChange,
    ],
  );

  return (
    <SettingsModalContext.Provider value={contextValue}>
      {children}
      <ConfirmModal
        isOpen={Boolean(confirmAction)}
        title={t("heading.discardChanges")}
        confirmLabel={t("actions.discard")}
        extraLabel={getBlockedPanel()?.saveHandler ? t("actions.save") : undefined}
        onExtra={getBlockedPanel()?.saveHandler ? handleSave : undefined}
        isExtraConfirming={isSaving}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      >
        <p className="mb-0">{confirmReason ?? t("confirm.discardSettingsChangesBody")}</p>
      </ConfirmModal>
    </SettingsModalContext.Provider>
  );
}

type SettingsPanelProviderProps = {
  panelId: string;
  label?: string;
  children: ReactNode;
};

export function SettingsPanelProvider({ panelId, label, children }: SettingsPanelProviderProps) {
  const modalContext = useSettingsModalContext();

  useEffect(() => {
    modalContext.registerPanel(panelId);
    if (label) {
      modalContext.setPanelLabel(panelId, label);
    }
    return () => {
      modalContext.unregisterPanel(panelId);
    };
  }, [label, modalContext, panelId]);

  return (
    <SettingsPanelContext.Provider value={{ panelId }}>
      {children}
    </SettingsPanelContext.Provider>
  );
}

export function useSettingsPanel(): SettingsPanelApi {
  const { panelId } = useSettingsPanelContext();
  const modalContext = useSettingsModalContext();

  return useMemo(
    () => ({
      setBlocked: (blocked: boolean, reason?: string) =>
        modalContext.setBlocked(panelId, blocked, reason),
      setPanelLabel: (label: string) => modalContext.setPanelLabel(panelId, label),
      setSaveHandler: (handler?: () => void | Promise<void>) =>
        modalContext.setSaveHandler(panelId, handler),
      setBeforeClose: (handler?: () => void | Promise<void>) =>
        modalContext.setBeforeClose(panelId, handler),
      canClose: () => modalContext.canClose(),
      requestClose: () => modalContext.requestClose(),
      requestAreaChange: (nextAreaId: string) =>
        modalContext.requestAreaChange(nextAreaId),
    }),
    [modalContext, panelId],
  );
}

export function useSettingsModalControls() {
  return useSettingsModalContext();
}
