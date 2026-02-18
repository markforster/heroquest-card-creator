"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useEscapeKey } from "./useEscapeKey";
import { useEscapeListener } from "./useEscapeListener";

type EscapeEntry = {
  id: string;
  onEscape: () => void;
  enabled: boolean;
  order: number;
};

type EscapeStackContextValue = {
  register: (id: string, onEscape: () => void, enabled: boolean) => void;
  unregister: (id: string) => void;
  update: (id: string, onEscape: () => void, enabled: boolean) => void;
};

const EscapeStackContext = createContext<EscapeStackContextValue | null>(null);

export function EscapeStackProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<EscapeEntry[]>([]);
  const orderRef = useRef(0);

  const register = useCallback((id: string, onEscape: () => void, enabled: boolean) => {
    setEntries((prev) => {
      if (prev.some((entry) => entry.id === id)) {
        return prev.map((entry) =>
          entry.id === id ? { ...entry, onEscape, enabled } : entry,
        );
      }
      orderRef.current += 1;
      return [...prev, { id, onEscape, enabled, order: orderRef.current }];
    });
  }, []);

  const update = useCallback((id: string, onEscape: () => void, enabled: boolean) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, onEscape, enabled } : entry)),
    );
  }, []);

  const unregister = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const active = entries
        .filter((entry) => entry.enabled)
        .sort((a, b) => b.order - a.order)[0];
      if (!active) return;
      event.preventDefault();
      active.onEscape();
    },
    [entries],
  );

  useEscapeListener(handleEscape);

  const value = useMemo(() => ({ register, unregister, update }), [register, unregister, update]);

  return <EscapeStackContext.Provider value={value}>{children}</EscapeStackContext.Provider>;
}

export function useEscapeStack() {
  const ctx = useContext(EscapeStackContext);
  if (!ctx) {
    throw new Error("useEscapeStack must be used within EscapeStackProvider");
  }
  return ctx;
}

export function useOptionalEscapeStack() {
  return useContext(EscapeStackContext);
}

export function useEscapeModalAware(options: {
  id: string;
  isOpen: boolean;
  onEscape: () => void;
  enabled?: boolean;
}) {
  const ctx = useOptionalEscapeStack();
  const { id, isOpen, onEscape, enabled = true } = options;

  useEffect(() => {
    if (!ctx) return;
    if (!isOpen) {
      ctx.unregister(id);
      return;
    }
    ctx.register(id, onEscape, enabled);
    return () => ctx.unregister(id);
  }, [ctx, enabled, id, isOpen, onEscape]);

  useEscapeKey({ enabled: !ctx && isOpen && enabled, onEscape });
}
