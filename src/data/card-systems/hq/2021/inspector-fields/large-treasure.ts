import { sx, sy } from "@/config/card-canvas";
import type { InspectorField } from "@/types/inspector";

export const LARGE_TREASURE_INSPECTOR_FIELDS: InspectorField[] = [
  {
    fieldType: "title",
    bind: "title",
    labelKey: "form.cardTitle",
    required: true,
    showToolbar: true,
    showTitleColor: true,
  },
  {
    fieldType: "image",
    bind: "imageAssetId",
    labelKey: "form.cardImage",
    props: { boundsWidth: sx(500), boundsHeight: sy(370) },
  },
  {
    fieldType: "text",
    bind: "description",
    labelKey: "form.cardText",
    props: {
      showTextColor: true,
    },
  },
  {
    fieldType: "borderColor",
    bind: "borderColor",
    labelKey: "form.borderColor",
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
