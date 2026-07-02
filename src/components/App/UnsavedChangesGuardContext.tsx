"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";

import { ENABLE_UNSAVED_CHANGES_GUARD } from "@/config/flags";
import ConfirmModal from "@/components/Modals/ConfirmModal";

import type { Location } from "react-router-dom";
import type { ReactNode } from "react";

type UnsavedChangesRegistration = {
  enabled: boolean;
  isDirty: boolean;
  title: string;
  body: string;
};

type UnsavedChangesGuardContextValue = {
  bypassNextNavigation: () => void;
  setRegistration: (registration: UnsavedChangesRegistration) => void;
};

const DEFAULT_REGISTRATION: UnsavedChangesRegistration = {
  enabled: false,
  isDirty: false,
  title: "",
  body: "",
};

const noop = () => {};

const UnsavedChangesGuardContext = createContext<UnsavedChangesGuardContextValue>({
  bypassNextNavigation: noop,
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
  const [registration, setRegistration] = useState<UnsavedChangesRegistration>(
    DEFAULT_REGISTRATION,
  );
  const registrationRef = useRef<UnsavedChangesRegistration>(registration);
  const bypassNextNavigationCountRef = useRef(0);

  useEffect(() => {
    registrationRef.current = registration;
  }, [registration]);

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

  useBeforeUnload((event) => {
    if (!ENABLE_UNSAVED_CHANGES_GUARD) return;
    const current = registrationRef.current;
    if (!current.enabled || !current.isDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  const contextValue = useMemo<UnsavedChangesGuardContextValue>(
    () => ({
      bypassNextNavigation: () => {
        bypassNextNavigationCountRef.current += 1;
      },
      setRegistration,
    }),
    [],
  );

  return (
    <UnsavedChangesGuardContext.Provider value={contextValue}>
      {children}
      <ConfirmModal
        isOpen={ENABLE_UNSAVED_CHANGES_GUARD && blocker.state === "blocked"}
        title={registration.title}
        confirmLabel={undefined}
        cancelLabel={undefined}
        onConfirm={() => {
          if (blocker.state !== "blocked") return;
          blocker.proceed();
        }}
        onCancel={() => {
          if (blocker.state !== "blocked") return;
          blocker.reset();
        }}
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
