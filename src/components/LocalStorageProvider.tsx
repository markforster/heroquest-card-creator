"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { ReactNode } from "react";

type LocalStorageValues = Record<string, string | null | undefined>;

type LocalStorageContextValue = {
  values: LocalStorageValues;
  ensureValue: (key: string, fallbackRaw: string) => void;
  setValue: (key: string, raw: string) => void;
};

const LocalStorageContext = createContext<LocalStorageContextValue | null>(null);

function useLocalStorageContext(): LocalStorageContextValue {
  const ctx = useContext(LocalStorageContext);
  if (!ctx) {
    throw new Error("LocalStorageContext is missing");
  }
  return ctx;
}

type LocalStorageProviderProps = {
  children: ReactNode;
};

export function LocalStorageProvider({ children }: LocalStorageProviderProps) {
  const [values, setValues] = useState<LocalStorageValues>({});

  const ensureValue = useCallback((key: string, fallbackRaw: string) => {
    setValues((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, key)) {
        return prev;
      }
      let stored: string | null = null;
      if (typeof window !== "undefined") {
        try {
          stored = window.localStorage.getItem(key);
        } catch {
          stored = null;
        }
      }
      return {
        ...prev,
        [key]: stored ?? fallbackRaw,
      };
    });
  }, []);

  const setValue = useCallback((key: string, raw: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: raw,
    }));
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, raw);
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const value = useMemo<LocalStorageContextValue>(
    () => ({ values, ensureValue, setValue }),
    [values, ensureValue, setValue],
  );

  return <LocalStorageContext.Provider value={value}>{children}</LocalStorageContext.Provider>;
}

type UseLocalStorageValueOptions<T> = {
  parse?: (raw: string) => T | null;
  serialize?: (value: T) => string;
};

export function useLocalStorageValue<T>(
  key: string,
  defaultValue: T,
  options: UseLocalStorageValueOptions<T> = {},
) {
  const { values, ensureValue, setValue } = useLocalStorageContext();
  const serialize = options.serialize ?? ((value: T) => JSON.stringify(value));
  const parse = options.parse ?? ((raw: string) => {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    ensureValue(key, serialize(defaultValue));
  }, [ensureValue, key, defaultValue, serialize]);

  const raw = values[key];
  const parsed = typeof raw === "string" ? parse(raw) : null;
  const value = parsed ?? defaultValue;

  const set = useCallback(
    (next: T) => {
      setValue(key, serialize(next));
    },
    [key, serialize, setValue],
  );

  return [value, set] as const;
}

export function useLocalStorageBoolean(key: string, defaultValue: boolean) {
  return useLocalStorageValue<boolean>(key, defaultValue, {
    parse: (raw) => {
      if (raw === "1") return true;
      if (raw === "0") return false;
      if (raw === "true") return true;
      if (raw === "false") return false;
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "boolean" ? parsed : null;
      } catch {
        return null;
      }
    },
    serialize: (value) => (value ? "1" : "0"),
  });
}
