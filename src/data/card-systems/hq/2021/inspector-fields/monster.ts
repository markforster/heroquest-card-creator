import { sx, sy } from "@/config/card-canvas";
import type { InspectorField } from "@/types/inspector";

export const MONSTER_INSPECTOR_FIELDS: InspectorField[] = [
  {
    fieldType: "title",
    bind: "title",
    labelKey: "form.monsterName",
    required: true,
    showToolbar: true,
    showTitleColor: true,
  },
  {
    fieldType: "image",
    bind: "imageAssetId",
    labelKey: "form.monsterImage",
    props: { boundsWidth: sx(730), boundsHeight: sy(730) },
  },
  {
    fieldType: "backgroundTint",
    bind: "backgroundTint",
    labelKey: "form.backgroundTint",
  },
  {
    fieldType: "monsterIcon",
    bind: "iconAssetId",
    labelKey: "form.monsterIcon",
  },
  {
    fieldType: "stats",
    statsType: "monster",
    labelKey: "form.stats",
    allowSplit: true,
    allowWildcard: true,
    splitSecondaryDefault: 0,
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
    fieldType: "copyright",
    bind: "copyright",
    labelKey: "form.copyright",
    placeholderKey: "placeholders.copyright",
    showToggle: true,
  },
];
