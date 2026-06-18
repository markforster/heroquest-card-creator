import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
import type { InspectorField } from "@/types/inspector";

export const LABELLED_BACK_INSPECTOR_FIELDS: InspectorField[] = [
  {
    fieldType: "title",
    bind: "title",
    labelKey: "form.backLabel",
    required: true,
    showToggle: true,
    showPlacement: true,
    showStyleToggle: true,
    showToolbar: true,
    showTitleColor: true,
  },
  {
    fieldType: "image",
    bind: "imageAssetId",
    labelKey: "form.backImage",
    props: { boundsWidth: CARD_WIDTH, boundsHeight: CARD_HEIGHT },
  },
  {
    fieldType: "text",
    bind: "description",
    labelKey: "form.backText",
    showToggle: true,
    props: {
      showToolbar: true,
      showTextColor: true,
      showBackdropColor: true,
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
