import type { InspectorField } from "@/types/inspector";

export const LOGO_BACK_INSPECTOR_FIELDS: InspectorField[] = [
  {
    fieldType: "name",
    bind: "name",
    labelKey: "form.name",
    required: true,
  },
  {
    fieldType: "backgroundTint",
    bind: "backgroundTint",
    labelKey: "form.backgroundTint",
  },
  {
    fieldType: "heroBackLogo",
    bind: "heroBackLogoMode",
    labelKey: "form.heroBackLogo",
  },
  {
    fieldType: "copyright",
    bind: "copyright",
    labelKey: "form.copyright",
    placeholderKey: "placeholders.copyright",
    showToggle: true,
  },
];
