"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";

import { cardTemplates } from "@/data/card-templates";
import { createEditorDefaultValues } from "@/lib/editor-form";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import type { ReactNode } from "react";

type EditorFormContextValue = {
  methods: UseFormReturn<CardDataByTemplate[TemplateId]>;
  savedValues: CardDataByTemplate[TemplateId] | null;
  resetWithSaved: (values: CardDataByTemplate[TemplateId]) => void;
};

const EditorFormContext = createContext<EditorFormContextValue | null>(null);

export function EditorFormProvider({ children }: { children: ReactNode }) {
  const initialTemplateId = (cardTemplates[0]?.id ?? "hero") as TemplateId;
  const initialValues = createEditorDefaultValues(initialTemplateId) as CardDataByTemplate[TemplateId];
  const methods = useForm<CardDataByTemplate[TemplateId]>({
    defaultValues: initialValues,
    mode: "onBlur",
  });
  const [savedValues, setSavedValues] =
    useState<CardDataByTemplate[TemplateId] | null>(initialValues);

  const resetWithSaved = useCallback(
    (values: CardDataByTemplate[TemplateId]) => {
      methods.reset(values);
      setSavedValues(values);
    },
    [methods],
  );

  const value = useMemo(
    () => ({
      methods,
      savedValues,
      resetWithSaved,
    }),
    [methods, savedValues, resetWithSaved],
  );

  return (
    <EditorFormContext.Provider value={value}>
      <FormProvider {...methods}>{children}</FormProvider>
    </EditorFormContext.Provider>
  );
}

export function useEditorForm() {
  const ctx = useContext(EditorFormContext);
  if (!ctx) {
    throw new Error("useEditorForm must be used within EditorFormProvider");
  }
  return ctx;
}
