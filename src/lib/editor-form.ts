import { inspectorFieldsByTemplate } from "@/data/inspector-fields";
import { createDefaultCardData, type CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

export function applyInspectorDefaults<T extends TemplateId>(
  templateId: T,
  data: CardDataByTemplate[T],
): CardDataByTemplate[T] {
  const fields = inspectorFieldsByTemplate[templateId];
  if (!fields) return data;
  const showTitleToggle = fields.some((field) => field.fieldType === "title" && field.showToggle);
  const showTitlePlacement = fields.some(
    (field) => field.fieldType === "title" && field.showPlacement,
  );
  const showTitleStyle = fields.some(
    (field) => field.fieldType === "title" && field.showStyleToggle,
  );
  return {
    ...data,
    ...(showTitleToggle ? { showTitle: data.showTitle ?? true } : {}),
    ...(showTitlePlacement
      ? {
          titlePlacement:
            (data as { titlePlacement?: "top" | "bottom" }).titlePlacement ?? "bottom",
        }
      : {}),
    ...(showTitleStyle
      ? {
          titleStyle:
            (data as { titleStyle?: "ribbon" | "plain" }).titleStyle ?? "ribbon",
        }
      : {}),
  } as CardDataByTemplate[T];
}

export function createEditorDefaultValues<T extends TemplateId>(
  templateId: T,
): CardDataByTemplate[T] {
  return applyInspectorDefaults(templateId, createDefaultCardData(templateId));
}
