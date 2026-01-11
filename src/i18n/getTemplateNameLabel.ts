import type { TemplateId } from "@/types/templates";

import { templateNameLabels } from "./messages";

import type { SupportedLanguage } from "./messages";

export function getTemplateNameLabel(
  language: SupportedLanguage,
  template: { id: TemplateId; name: string },
): string {
  return templateNameLabels[language]?.[template.id] ?? template.name;
}
