import type { InspectorFieldsByTemplate } from "@/types/inspector";

export const inspectorFieldsByTemplate: InspectorFieldsByTemplate = {
  hero: [
    {
      fieldType: "title",
      bind: "title",
      labelKey: "form.heroName",
      required: true,
    },
    {
      fieldType: "image",
      bind: "imageAssetId",
      labelKey: "form.heroImage",
      props: { boundsWidth: 730, boundsHeight: 730 },
    },
    {
      fieldType: "stats",
      statsType: "hero",
      labelKey: "form.stats",
    },
    {
      fieldType: "text",
      bind: "description",
      labelKey: "form.cardText",
    },
  ],
  monster: [
    {
      fieldType: "title",
      bind: "title",
      labelKey: "form.monsterName",
      required: true,
    },
    {
      fieldType: "image",
      bind: "imageAssetId",
      labelKey: "form.monsterImage",
      props: { boundsWidth: 730, boundsHeight: 730 },
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
    },
    {
      fieldType: "text",
      bind: "description",
      labelKey: "form.cardText",
    },
  ],
  "small-treasure": [
    {
      fieldType: "title",
      bind: "title",
      labelKey: "form.cardTitle",
      required: true,
    },
    {
      fieldType: "image",
      bind: "imageAssetId",
      labelKey: "form.cardImage",
      props: { boundsWidth: 500, boundsHeight: 180 },
    },
    {
      fieldType: "text",
      bind: "description",
      labelKey: "form.cardText",
    },
  ],
  "large-treasure": [
    {
      fieldType: "title",
      bind: "title",
      labelKey: "form.cardTitle",
      required: true,
    },
    {
      fieldType: "image",
      bind: "imageAssetId",
      labelKey: "form.cardImage",
      props: { boundsWidth: 500, boundsHeight: 370 },
    },
    {
      fieldType: "text",
      bind: "description",
      labelKey: "form.cardText",
    },
  ],
  "hero-back": [
    {
      fieldType: "title",
      bind: "title",
      labelKey: "form.backTitle",
      required: false,
    },
    {
      fieldType: "text",
      bind: "description",
      labelKey: "form.backText",
    },
  ],
  "labelled-back": [
    {
      fieldType: "title",
      bind: "title",
      labelKey: "form.backLabel",
      required: true,
    },
    {
      fieldType: "image",
      bind: "imageAssetId",
      labelKey: "form.backImage",
      props: { boundsWidth: 750, boundsHeight: 1050 },
    },
    {
      fieldType: "borderColor",
      bind: "borderColor",
      labelKey: "form.borderColor",
    },
  ],
};
