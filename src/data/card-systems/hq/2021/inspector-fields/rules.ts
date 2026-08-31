import type { InspectorField } from "@/types/inspector";

export const RULES_INSPECTOR_FIELDS: InspectorField[] = [
  {
    fieldType: "name",
    bind: "name",
    labelKey: "form.name",
    required: true,
  },
  {
    fieldType: "text",
    bind: "description",
    labelKey: "form.rulesText",
    props: {
      showTextColor: true,
    },
  },
  {
    fieldType: "backgroundTint",
    bind: "backgroundTint",
    labelKey: "form.backgroundTint",
  },
  {
    fieldType: "copyright",
    bind: "copyright",
    labelKey: "form.copyright",
    placeholderKey: "placeholders.copyright",
    showToggle: true,
  },
];
