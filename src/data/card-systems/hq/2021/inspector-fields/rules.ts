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
    fieldType: "copyright",
    bind: "copyright",
    labelKey: "form.copyright",
    placeholderKey: "placeholders.copyright",
    showToggle: true,
  },
];
