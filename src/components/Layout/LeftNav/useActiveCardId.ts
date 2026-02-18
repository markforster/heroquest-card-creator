"use client";

import { useMemo } from "react";

import type { TemplateId } from "@/types/templates";

type ActiveCardIdByTemplate = Partial<Record<TemplateId, string>>;

type UseActiveCardIdArgs = {
  selectedTemplateId?: TemplateId | null;
  activeCardIdByTemplate: ActiveCardIdByTemplate;
};

export function useActiveCardId({
  selectedTemplateId,
  activeCardIdByTemplate,
}: UseActiveCardIdArgs) {
  return useMemo(
    () => (selectedTemplateId != null ? activeCardIdByTemplate[selectedTemplateId] : undefined),
    [activeCardIdByTemplate, selectedTemplateId],
  );
}
