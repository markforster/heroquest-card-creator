import { inspectorFieldsByTemplate } from "@/data/inspector-fields";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

export function templateSupportsCustomName(templateId: TemplateId): boolean {
  return (
    inspectorFieldsByTemplate[templateId]?.some((field) => field.fieldType === "title") ?? false
  );
}

export function isCustomNameEnabled(value: unknown): boolean {
  return value === true;
}

export function resolveLinkedTitleName<T extends TemplateId>(
  templateId: T,
  data: CardDataByTemplate[T],
): { name: string; customNameEnabled?: true } {
  const title = data.title?.toString() ?? "";
  const explicitName = data.name?.toString() ?? "";
  if (templateSupportsCustomName(templateId) && !isCustomNameEnabled(data.customNameEnabled)) {
    return { name: title };
  }
  return {
    name: explicitName,
    ...(isCustomNameEnabled(data.customNameEnabled) ? { customNameEnabled: true } : {}),
  };
}

export function cardMatchesNameOrTitleSearch(
  card: { name: string; nameLower?: string; title?: string | null },
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  const nameLower = card.nameLower ?? card.name.toLocaleLowerCase();
  if (nameLower.includes(normalizedQuery)) return true;

  const titleLower = card.title?.toLocaleLowerCase();
  return titleLower?.includes(normalizedQuery) ?? false;
}
