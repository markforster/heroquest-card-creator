"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";

import { ENABLE_UNSAVED_CHANGES_GUARD } from "@/config/flags";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useI18n } from "@/i18n/I18nProvider";

import type { Location } from "react-router-dom";
import type { ReactNode } from "react";

type UnsavedChangesRegistration = {
  enabled: boolean;
  isDirty: boolean;
  title: string;
  body: string;
  saveCurrentCard?: () => Promise<boolean>;
};

type UnsavedChangesGuardContextValue = {
  bypassNextNavigation: () => void;
  runWithUnsavedChangesGuard: (action: () => void | Promise<void>) => boolean;
  setRegistration: (registration: UnsavedChangesRegistration) => void;
};

type PendingAction = {
  run: () => void | Promise<void>;
  onCancel?: () => void;
};

const DEFAULT_REGISTRATION: UnsavedChangesRegistration = {
  enabled: false,
  isDirty: false,
  title: "",
  body: "",
  saveCurrentCard: undefined,
};

const noop = () => {};

const UnsavedChangesGuardContext = createContext<UnsavedChangesGuardContextValue>({
  bypassNextNavigation: noop,
  runWithUnsavedChangesGuard: () => true,
  setRegistration: noop,
});

function isSameLocation(currentLocation: Location, nextLocation: Location): boolean {
  return (
    currentLocation.pathname === nextLocation.pathname &&
    currentLocation.search === nextLocation.search &&
    currentLocation.hash === nextLocation.hash
  );
}

export function UnsavedChangesGuardProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [registration, setRegistration] = useState<UnsavedChangesRegistration>(
    DEFAULT_REGISTRATION,
  );
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const registrationRef = useRef<UnsavedChangesRegistration>(registration);
  const bypassNextNavigationCountRef = useRef(0);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!ENABLE_UNSAVED_CHANGES_GUARD) return false;
    if (bypassNextNavigationCountRef.current > 0) {
      bypassNextNavigationCountRef.current -= 1;
      return false;
    }

    const current = registrationRef.current;
    if (!current.enabled || !current.isDirty) return false;
    if (isSameLocation(currentLocation, nextLocation)) return false;

    return true;
  });
  const blockerRef = useRef(blocker);
  const pendingActionRef = useRef<PendingAction | null>(pendingAction);

  useEffect(() => {
    registrationRef.current = registration;
  }, [registration]);

  useEffect(() => {
    blockerRef.current = blocker;
  }, [blocker]);

  useEffect(() => {
    pendingActionRef.current = pendingAction;
  }, [pendingAction]);

  useBeforeUnload((event) => {
    if (!ENABLE_UNSAVED_CHANGES_GUARD) return;
    const current = registrationRef.current;
    if (!current.enabled || !current.isDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    setPendingAction((current) => {
      if (current) return current;
      return {
        run: () => {
          if (blockerRef.current.state === "blocked") {
            blockerRef.current.proceed();
          }
        },
        onCancel: () => {
          if (blockerRef.current.state === "blocked") {
            blockerRef.current.reset();
          }
        },
      };
    });
  }, [blocker.state]);

  const contextValue = useMemo<UnsavedChangesGuardContextValue>(
    () => ({
      bypassNextNavigation: () => {
        bypassNextNavigationCountRef.current += 1;
      },
      runWithUnsavedChangesGuard: (action) => {
        const current = registrationRef.current;
        if (!current.enabled || !current.isDirty) {
          void action();
          return true;
        }
        setPendingAction({
          run: action,
        });
        return false;
      },
      setRegistration,
    }),
    [],
  );

  const handleCancel = () => {
    const currentPendingAction = pendingActionRef.current;
    setPendingAction(null);
    currentPendingAction?.onCancel?.();
  };

  const handleDiscard = async () => {
    const currentPendingAction = pendingActionRef.current;
    setPendingAction(null);
    await currentPendingAction?.run();
  };

  const handleSave = async () => {
    const currentPendingAction = pendingActionRef.current;
    const saveCurrentCard = registrationRef.current.saveCurrentCard;
    setPendingAction(null);
    if (!currentPendingAction || !saveCurrentCard) return;
    setIsSaving(true);
    try {
      const didSave = await saveCurrentCard();
      if (!didSave) return;
      await currentPendingAction.run();
    } finally {
      setIsSaving(false);
    }
  };

  return (
      <UnsavedChangesGuardContext.Provider value={contextValue}>
        {children}
        <ConfirmModal
        isOpen={pendingAction !== null}
        title={registration.title}
        confirmLabel={t("actions.discard")}
        cancelLabel={undefined}
        extraLabel={registration.saveCurrentCard ? t("actions.save") : undefined}
        onExtra={registration.saveCurrentCard ? () => void handleSave() : undefined}
        isExtraConfirming={isSaving}
        onConfirm={() => {
          void handleDiscard();
        }}
        onCancel={handleCancel}
      >
        <p className="mb-0">{registration.body}</p>
      </ConfirmModal>
    </UnsavedChangesGuardContext.Provider>
  );
}

export function usePublishUnsavedChangesGuard(registration: UnsavedChangesRegistration) {
  const { setRegistration } = useContext(UnsavedChangesGuardContext);

  useEffect(() => {
    if (!ENABLE_UNSAVED_CHANGES_GUARD) {
      setRegistration(DEFAULT_REGISTRATION);
      return;
    }
    setRegistration(registration);
    return () => {
      setRegistration(DEFAULT_REGISTRATION);
    };
  }, [registration, setRegistration]);
}

export function useUnsavedChangesGuardControls() {
  return useContext(UnsavedChangesGuardContext);
}
