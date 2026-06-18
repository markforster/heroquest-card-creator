import type { InspectorField } from "@/types/inspector";

export const HERO_BACK_INSPECTOR_FIELDS: InspectorField[] = [
  {
    fieldType: "title",
    bind: "title",
    labelKey: "form.backTitle",
    required: false,
    showToolbar: true,
    showTitleColor: true,
  },
  {
    fieldType: "backgroundTint",
    bind: "backgroundTint",
    labelKey: "form.backgroundTint",
  },
  {
    fieldType: "text",
    bind: "description",
    labelKey: "form.backText",
    props: {
      showToolbar: true,
      showTextColor: true,
      showBackdropColor: true,
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
