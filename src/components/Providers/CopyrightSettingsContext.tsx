"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { apiClient } from "@/api/client";
import {
  resolveTemplateCopyrightDefault,
  type CopyrightTemplateDefaults,
} from "@/lib/copyright-defaults";
import type { TemplateId } from "@/types/templates";

type CopyrightSettingsContextValue = {
  defaultCopyright: string;
  templateDefaults: CopyrightTemplateDefaults;
  getTemplateDefault: (templateId: TemplateId) => boolean;
  setDefaultCopyright: (value: string) => void;
  setTemplateDefault: (templateId: TemplateId, value: boolean) => void;
  isReady: boolean;
};

const CopyrightSettingsContext = createContext<CopyrightSettingsContextValue | null>(null);

export function CopyrightSettingsProvider({ children }: { children: React.ReactNode }) {
  const [defaultCopyright, setDefaultCopyrightState] = useState("");
  const [templateDefaults, setTemplateDefaultsState] = useState<CopyrightTemplateDefaults>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.getDefaultCopyright(),
      apiClient.getCopyrightTemplateDefaults(),
    ])
      .then(([defaultValue, templateValue]) => {
        if (!active) return;
        setDefaultCopyrightState(typeof defaultValue === "string" ? defaultValue : "");
        setTemplateDefaultsState(templateValue ?? {});
      })
      .catch(() => {
        if (!active) return;
        setDefaultCopyrightState("");
        setTemplateDefaultsState({});
      })
      .finally(() => {
        if (active) setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setDefaultCopyright = useCallback((value: string) => {
    const normalized = value.trim();
    setDefaultCopyrightState(normalized);
    apiClient
      .setDefaultCopyright({ value: normalized })
      .catch(() => {
        // Ignore persistence failures; UI still reflects latest value.
      });
  }, []);

  const setTemplateDefault = useCallback((templateId: TemplateId, value: boolean) => {
    setTemplateDefaultsState((prev) => {
      const next = {
        ...prev,
        [templateId]: value,
      };
      apiClient.setCopyrightTemplateDefaults({ value: next }).catch(() => {
        // Ignore persistence failures; UI still reflects latest value.
      });
      return next;
    });
  }, []);

  const getTemplateDefault = useCallback(
    (templateId: TemplateId) => resolveTemplateCopyrightDefault(templateId, templateDefaults),
    [templateDefaults],
  );

  const value = useMemo(
    () => ({
      defaultCopyright,
      templateDefaults,
      getTemplateDefault,
      setDefaultCopyright,
      setTemplateDefault,
      isReady,
    }),
    [
      defaultCopyright,
      templateDefaults,
      getTemplateDefault,
      setDefaultCopyright,
      setTemplateDefault,
      isReady,
    ],
  );

  return (
    <CopyrightSettingsContext.Provider value={value}>
      {children}
    </CopyrightSettingsContext.Provider>
  );
}

export function useCopyrightSettings(): CopyrightSettingsContextValue {
  const ctx = useContext(CopyrightSettingsContext);
  if (!ctx) {
    throw new Error("useCopyrightSettings must be used within CopyrightSettingsProvider");
  }
  return ctx;
}
