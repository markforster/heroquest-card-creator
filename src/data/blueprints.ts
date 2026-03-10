import smallLargeArtworkBorderMask from "@/assets/card-backgrounds/small-large-artwork-border-alpha-mask.png";
import smallLargeArtworkBorderTexture from "@/assets/card-backgrounds/small-large-artwork-border-blend-texture.png";
import largeWindowFrame from "@/assets/card-backgrounds/large-window-frame.png";
import smallWindowFrame from "@/assets/card-backgrounds/small-window-frame.png";
import whitePaperBackground from "@/assets/card-backgrounds/white-paper.png";
import { CARD_HEIGHT, CARD_WIDTH, savg, sx, sy } from "@/config/card-canvas";
import { DEFAULT_COPYRIGHT_COLOR } from "@/config/colors";
import { EMPHASIZED_LABEL_WEIGHT } from "@/config/typography";
import type { Blueprint, BlueprintBounds } from "@/types/blueprints";
import type { TemplateId } from "@/types/templates";

const DESCRIPTION_FONT_SIZE = savg(32);
const DESCRIPTION_LINE_HEIGHT = DESCRIPTION_FONT_SIZE * 1.25;
const DESCRIPTION_LETTER_SPACING = 0.000015;
const HERO_MONSTER_BODY_FONT_SIZE = savg(26);
const HERO_MONSTER_BODY_LINE_HEIGHT = HERO_MONSTER_BODY_FONT_SIZE * 1.05;
const HERO_MONSTER_BODY_LETTER_SPACING = 0.000015;
const COPYRIGHT_FONT_SIZE = savg(20);
const COPYRIGHT_LINE_HEIGHT = savg(20);
const COPYRIGHT_HEIGHT = sy(22);
const COPYRIGHT_BOTTOM_MARGIN = sy(24);
const COPYRIGHT_STACK_GAP = sy(8);
const COPYRIGHT_BOUNDS = {
  x: sx(60),
  y: CARD_HEIGHT - COPYRIGHT_BOTTOM_MARGIN - COPYRIGHT_HEIGHT,
  width: sx(630),
  height: COPYRIGHT_HEIGHT,
};
const COPYRIGHT_BOUNDS_ARTWORK = {
  ...COPYRIGHT_BOUNDS,
  y: COPYRIGHT_BOUNDS.y - sy(56),
};
const HERO_MONSTER_STACK_ORIGIN_Y = COPYRIGHT_BOUNDS.y - COPYRIGHT_STACK_GAP;
const TREASURE_DESC_X = sx(120);
const TREASURE_DESC_WIDTH = sx(515);
const TREASURE_DESC_BOTTOM = sy(986);
const RIBBON_BOUNDS = { x: 86, y: 46, width: 578, height: 145.15 };
const RIBBON_TEXT_BOUNDS = { x: 171, y: 66, width: 428, height: 58.15 };
const RIBBON_TEXT_BOUNDS_NO_RIBBON = { x: 81, y: 82, width: 588, height: 60.15 };

const scaleBounds = (bounds: BlueprintBounds): BlueprintBounds => ({
  x: sx(bounds.x),
  y: sy(bounds.y),
  width: sx(bounds.width),
  height: sy(bounds.height),
});

const makeRibbonBounds = (overrides?: Partial<typeof RIBBON_BOUNDS>) =>
  scaleBounds({
    ...RIBBON_BOUNDS,
    ...(overrides ?? {}),
  });

const makeRibbonTextBounds = (overrides?: Partial<typeof RIBBON_TEXT_BOUNDS>) =>
  scaleBounds({
    ...RIBBON_TEXT_BOUNDS,
    ...(overrides ?? {}),
  });

const makeRibbonTextNoRibbonBounds = (overrides?: Partial<typeof RIBBON_TEXT_BOUNDS_NO_RIBBON>) =>
  scaleBounds({
    ...RIBBON_TEXT_BOUNDS_NO_RIBBON,
    ...(overrides ?? {}),
  });

const expandBounds = (bounds: BlueprintBounds, inset: { x: number; y: number }) => ({
  x: bounds.x - inset.x,
  y: bounds.y - inset.y,
  width: bounds.width + inset.x * 2,
  height: bounds.height + inset.y * 2,
});

const makeTreasureDescBounds = (topY: number) => ({
  x: TREASURE_DESC_X,
  y: sy(topY),
  width: TREASURE_DESC_WIDTH,
  height: TREASURE_DESC_BOTTOM - sy(topY),
});

const SMALL_TREASURE_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  templateId: "small-treasure",
  canvas: { width: CARD_WIDTH, height: CARD_HEIGHT },
  layers: [
    {
      id: "background-base",
      type: "background",
      source: "asset",
      asset: whitePaperBackground,
    },
    {
      id: "background-frame",
      type: "background",
      source: "template",
      cutoutBounds: scaleBounds({ x: 122, y: 166, width: 506, height: 180 }),
    },
    {
      id: "artwork",
      type: "image",
      bounds: scaleBounds({ x: 122, y: 166, width: 506, height: 183 }),
      bind: { imageKey: "imageAssetId" },
      when: { hasImage: "imageAssetId" },
    },
    {
      id: "artwork-frame",
      type: "overlay",
      asset: smallWindowFrame,
      bounds: expandBounds(scaleBounds({ x: 123, y: 167, width: 509, height: 180 }), {
        x: sx(8),
        y: sy(8),
      }),
      props: { preserveAspectRatio: "none" },
    },
    {
      id: "border-texture",
      type: "border",
      mask: smallLargeArtworkBorderMask,
      texture: smallLargeArtworkBorderTexture,
      blendMode: "multiply",
      offsetX: sx(1),
      offsetY: sy(-1),
    },
    {
      id: "description",
      type: "text",
      bounds: makeTreasureDescBounds(366),
      bind: { textKey: "description" },
      props: {
        fontSize: DESCRIPTION_FONT_SIZE,
        lineHeight: DESCRIPTION_LINE_HEIGHT,
        letterSpacingEm: DESCRIPTION_LETTER_SPACING,
      },
    },
    {
      id: "title",
      type: "title",
      bind: { titleKey: "title" },
      props: {
        showRibbon: false,
        ribbonX: makeRibbonBounds({ y: 46 }).x,
        ribbonY: makeRibbonBounds({ y: 46 }).y,
        ribbonWidth: makeRibbonBounds().width,
        ribbonHeight: makeRibbonBounds().height,
        textX: makeRibbonTextBounds({ y: 46 }).x,
        textY: makeRibbonTextBounds({ y: 46 }).y,
        textWidth: makeRibbonTextBounds().width,
        textHeight: makeRibbonTextBounds().height,
        textNoRibbonX: makeRibbonTextNoRibbonBounds({ y: 82 }).x,
        textNoRibbonY: makeRibbonTextNoRibbonBounds({ y: 82 }).y,
        textNoRibbonWidth: makeRibbonTextNoRibbonBounds().width,
        textNoRibbonHeight: makeRibbonTextNoRibbonBounds().height,
      },
    },
    {
      id: "copyright",
      type: "copyright",
      bounds: COPYRIGHT_BOUNDS_ARTWORK,
      bind: { textKey: "copyright" },
      props: {
        fontSize: COPYRIGHT_FONT_SIZE,
        lineHeight: COPYRIGHT_LINE_HEIGHT,
        fontWeight: 500,
        align: "center",
        fill: DEFAULT_COPYRIGHT_COLOR,
        letterSpacingEm: -0.01,
        fontFamily: "Helvetica, Arial, sans-serif",
      },
    },
  ],
};

const LARGE_TREASURE_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  templateId: "large-treasure",
  canvas: { width: CARD_WIDTH, height: CARD_HEIGHT },
  layers: [
    {
      id: "background-base",
      type: "background",
      source: "asset",
      asset: whitePaperBackground,
    },
    {
      id: "background-frame",
      type: "background",
      source: "template",
      cutoutBounds: scaleBounds({ x: 123, y: 167, width: 509, height: 359 }),
    },
    {
      id: "artwork",
      type: "image",
      bounds: scaleBounds({ x: 123, y: 167, width: 509, height: 359 }),
      bind: { imageKey: "imageAssetId" },
      when: { hasImage: "imageAssetId" },
      props: { offsetX: sx(0), offsetY: sy(0) },
    },
    {
      id: "artwork-frame",
      type: "overlay",
      asset: largeWindowFrame,
      bounds: expandBounds(scaleBounds({ x: 123, y: 167, width: 509, height: 359 }), {
        x: sx(8),
        y: sy(8),
      }),
      props: { preserveAspectRatio: "none" },
    },
    {
      id: "border-texture",
      type: "border",
      mask: smallLargeArtworkBorderMask,
      texture: smallLargeArtworkBorderTexture,
      blendMode: "multiply",
      offsetX: sx(1),
      offsetY: sy(-1),
    },
    {
      id: "description",
      type: "text",
      bounds: makeTreasureDescBounds(555),
      bind: { textKey: "description" },
      props: {
        fontSize: DESCRIPTION_FONT_SIZE,
        lineHeight: DESCRIPTION_LINE_HEIGHT,
        letterSpacingEm: DESCRIPTION_LETTER_SPACING,
      },
    },
    {
      id: "title",
      type: "title",
      bind: { titleKey: "title" },
      props: {
        showRibbon: false,
        ribbonX: makeRibbonBounds({ y: 46 }).x,
        ribbonY: makeRibbonBounds({ y: 46 }).y,
        ribbonWidth: makeRibbonBounds().width,
        ribbonHeight: makeRibbonBounds().height,
        textX: makeRibbonTextBounds({ y: 46 }).x,
        textY: makeRibbonTextBounds({ y: 46 }).y,
        textWidth: makeRibbonTextBounds().width,
        textHeight: makeRibbonTextBounds().height,
        textNoRibbonX: makeRibbonTextNoRibbonBounds({ y: 82 }).x,
        textNoRibbonY: makeRibbonTextNoRibbonBounds({ y: 82 }).y,
        textNoRibbonWidth: makeRibbonTextNoRibbonBounds().width,
        textNoRibbonHeight: makeRibbonTextNoRibbonBounds().height,
      },
    },
    {
      id: "copyright",
      type: "copyright",
      bounds: COPYRIGHT_BOUNDS_ARTWORK,
      bind: { textKey: "copyright" },
      props: {
        fontSize: COPYRIGHT_FONT_SIZE,
        lineHeight: COPYRIGHT_LINE_HEIGHT,
        fontWeight: 500,
        align: "center",
        fill: DEFAULT_COPYRIGHT_COLOR,
        letterSpacingEm: -0.01,
        fontFamily: "Helvetica, Arial, sans-serif",
      },
    },
  ],
};

const LABELLED_BACK_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  templateId: "labelled-back",
  canvas: { width: CARD_WIDTH, height: CARD_HEIGHT },
  layers: [
    {
      id: "background-base",
      type: "background",
      source: "asset",
      asset: whitePaperBackground,
    },
    {
      id: "artwork",
      type: "image",
      bounds: scaleBounds({ x: 0, y: 0, width: 750, height: 1050 }),
      bind: { imageKey: "imageAssetId" },
      when: { hasImage: "imageAssetId" },
    },
    {
      id: "description",
      type: "text",
      bounds: {
        x: sx(26),
        y: sy(24),
        width: sx(696),
        height: sy(784),
      },
      bind: { textKey: "description" },
      props: {
        fontSize: DESCRIPTION_FONT_SIZE,
        lineHeight: DESCRIPTION_LINE_HEIGHT,
        letterSpacingEm: DESCRIPTION_LETTER_SPACING,
        topX: sx(26),
        topY: sy(210),
        topWidth: sx(696),
        topHeight: sy(816),
        flushX: sx(0),
        flushY: sy(0),
        flushWidth: CARD_WIDTH,
        flushHeight: sy(806),
        flushTopX: sx(0),
        flushTopY: sy(210),
        flushTopWidth: CARD_WIDTH,
        flushTopHeight: sy(840),
        hiddenX: sx(26),
        hiddenY: sy(24),
        hiddenWidth: sx(696),
        hiddenHeight: sy(1002),
        flushHiddenX: sx(0),
        flushHiddenY: sy(0),
        flushHiddenWidth: CARD_WIDTH,
        flushHiddenHeight: CARD_HEIGHT,
        backdrop: true,
        backdropFill: "#ffffff",
        backdropOpacity: 0.55,
        backdropRadius: savg(30),
        backdropCornerMode: "opposite-title",
        backdropInsetMode: "matchBorder",
        backdropFitMode: "full",
        backdropWhenImageKey: "imageAssetId",
        textPadding: savg(24),
      },
    },
    {
      id: "title",
      type: "title",
      bind: { titleKey: "title" },
      props: {
        y: sy(866),
        // Known working values (previous)
        ribbonX: makeRibbonBounds({ y: 866 }).x,
        ribbonY: makeRibbonBounds({ y: 866 }).y,
        ribbonWidth: makeRibbonBounds().width,
        ribbonHeight: makeRibbonBounds().height,
        textX: makeRibbonTextBounds({ y: 888 }).x,
        textY: makeRibbonTextBounds({ y: 888 }).y,
        textWidth: makeRibbonTextBounds().width,
        textHeight: makeRibbonTextBounds().height,
        textNoRibbonX: makeRibbonTextNoRibbonBounds({ y: 888 }).x,
        textNoRibbonY: makeRibbonTextNoRibbonBounds({ y: 888 }).y,
        textNoRibbonWidth: makeRibbonTextNoRibbonBounds().width,
        textNoRibbonHeight: makeRibbonTextNoRibbonBounds().height,
        textNoRibbonTopX: makeRibbonTextNoRibbonBounds({ y: 82 }).x,
        textNoRibbonTopY: makeRibbonTextNoRibbonBounds({ y: 82 }).y,
        textNoRibbonTopWidth: makeRibbonTextNoRibbonBounds().width,
        textNoRibbonTopHeight: makeRibbonTextNoRibbonBounds().height,
        ribbonTopX: makeRibbonBounds({ y: 46 }).x,
        ribbonTopY: makeRibbonBounds({ y: 46 }).y,
        ribbonTopWidth: makeRibbonBounds().width,
        ribbonTopHeight: makeRibbonBounds().height,
        textTopX: makeRibbonTextBounds({ y: 68 }).x,
        textTopY: makeRibbonTextBounds({ y: 68 }).y,
        textTopWidth: makeRibbonTextBounds().width,
        textTopHeight: makeRibbonTextBounds().height,
      },
    },
    {
      id: "background-frame",
      type: "border",
    },
    {
      id: "copyright",
      type: "copyright",
      bounds: COPYRIGHT_BOUNDS,
      bind: { textKey: "copyright" },
      props: {
        fontSize: COPYRIGHT_FONT_SIZE,
        lineHeight: COPYRIGHT_LINE_HEIGHT,
        fontWeight: 500,
        align: "center",
        fill: DEFAULT_COPYRIGHT_COLOR,
        letterSpacingEm: -0.01,
        fontFamily: "Helvetica, Arial, sans-serif",
      },
    },
  ],
};

const HERO_BACK_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  templateId: "hero-back",
  canvas: { width: CARD_WIDTH, height: CARD_HEIGHT },
  layers: [
    {
      id: "background",
      type: "background",
      source: "template",
    },
    {
      id: "description",
      type: "text",
      // bounds: scaleBounds({ x: 85, y: 303, width: 580, height: 664 }),
      bounds: scaleBounds({ x: 85, y: 289, width: 580, height: 673 }),
      bind: { textKey: "description" },
      props: {
        fontSize: DESCRIPTION_FONT_SIZE,
        lineHeight: DESCRIPTION_LINE_HEIGHT,
        letterSpacingEm: DESCRIPTION_LETTER_SPACING,
        fontWeight: 550,
        align: "center",
      },
    },
    {
      id: "copyright",
      type: "copyright",
      bounds: COPYRIGHT_BOUNDS,
      bind: { textKey: "copyright" },
      props: {
        fontSize: COPYRIGHT_FONT_SIZE,
        lineHeight: COPYRIGHT_LINE_HEIGHT,
        fontWeight: 500,
        align: "center",
        fill: DEFAULT_COPYRIGHT_COLOR,
        letterSpacingEm: -0.01,
        fontFamily: "Helvetica, Arial, sans-serif",
      },
    },
  ],
};

const HERO_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  templateId: "hero",
  canvas: { width: CARD_WIDTH, height: CARD_HEIGHT },
  layers: [
    {
      id: "background",
      type: "background",
      source: "template",
    },
    {
      id: "artwork",
      type: "image",
      bounds: scaleBounds({ x: 10, y: 120, width: 730, height: 730 }),
      bind: { imageKey: "imageAssetId" },
      when: { hasImage: "imageAssetId" },
    },
    {
      id: "title",
      type: "title",
      bind: { titleKey: "title" },
      props: {
        ribbonX: makeRibbonBounds({ y: 46 }).x,
        ribbonY: makeRibbonBounds({ y: 46 }).y,
        ribbonWidth: makeRibbonBounds().width,
        ribbonHeight: makeRibbonBounds().height,
        textX: makeRibbonTextBounds({ y: 66 }).x,
        textY: makeRibbonTextBounds({ y: 66 }).y,
        textWidth: makeRibbonTextBounds().width,
        textHeight: makeRibbonTextBounds().height,
      },
    },
    {
      id: "copyright",
      type: "copyright",
      bounds: COPYRIGHT_BOUNDS,
      bind: { textKey: "copyright" },
      props: {
        fontSize: COPYRIGHT_FONT_SIZE,
        lineHeight: COPYRIGHT_LINE_HEIGHT,
        fontWeight: 500,
        align: "center",
        fill: DEFAULT_COPYRIGHT_COLOR,
        letterSpacingEm: -0.01,
        fontFamily: "Helvetica, Arial, sans-serif",
      },
    },
  ],
  groups: [
    {
      id: "hero-bottom-stack",
      type: "stack",
      anchor: "bottom",
      direction: "up",
      // origin: { x: 65, y: 1020 },
      // width: 620,
      origin: { x: sx(54), y: HERO_MONSTER_STACK_ORIGIN_Y },
      width: sx(636),
      gap: sy(2),
      children: [
        {
          id: "hero-description",
          type: "text",
          bind: { textKey: "description" },
          props: {
            fontSize: HERO_MONSTER_BODY_FONT_SIZE,
            lineHeight: HERO_MONSTER_BODY_LINE_HEIGHT,
            letterSpacingEm: HERO_MONSTER_BODY_LETTER_SPACING,
            fontWeight: EMPHASIZED_LABEL_WEIGHT,
          },
        },
        {
          id: "hero-stats",
          type: "stats-hero",
          props: { height: sy(170) },
        },
      ],
    },
  ],
};

const MONSTER_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  templateId: "monster",
  canvas: { width: CARD_WIDTH, height: CARD_HEIGHT },
  layers: [
    {
      id: "background",
      type: "background",
      source: "template",
    },
    {
      id: "artwork",
      type: "image",
      bounds: scaleBounds({ x: 10, y: 120, width: 730, height: 730 }),
      bind: { imageKey: "imageAssetId" },
      when: { hasImage: "imageAssetId" },
    },
    {
      id: "title",
      type: "title",
      bind: { titleKey: "title" },
      props: {
        ribbonX: makeRibbonBounds({ y: 46 }).x,
        ribbonY: makeRibbonBounds({ y: 46 }).y,
        ribbonWidth: makeRibbonBounds().width,
        ribbonHeight: makeRibbonBounds().height,
        textX: makeRibbonTextBounds({ y: 66 }).x,
        textY: makeRibbonTextBounds({ y: 66 }).y,
        textWidth: makeRibbonTextBounds().width,
        textHeight: makeRibbonTextBounds().height,
      },
    },
    {
      id: "copyright",
      type: "copyright",
      bounds: COPYRIGHT_BOUNDS,
      bind: { textKey: "copyright" },
      props: {
        fontSize: COPYRIGHT_FONT_SIZE,
        lineHeight: COPYRIGHT_LINE_HEIGHT,
        fontWeight: 500,
        align: "center",
        fill: DEFAULT_COPYRIGHT_COLOR,
        letterSpacingEm: -0.01,
        fontFamily: "Helvetica, Arial, sans-serif",
      },
    },
  ],
  groups: [
    {
      id: "monster-bottom-stack",
      type: "stack",
      anchor: "bottom",
      direction: "up",
      origin: { x: sx(48), y: HERO_MONSTER_STACK_ORIGIN_Y },
      width: sx(652),
      gap: sy(2),
      children: [
        {
          id: "monster-description",
          type: "text",
          bind: { textKey: "description" },
          props: {
            fontSize: HERO_MONSTER_BODY_FONT_SIZE,
            lineHeight: HERO_MONSTER_BODY_LINE_HEIGHT,
            letterSpacingEm: HERO_MONSTER_BODY_LETTER_SPACING,
            fontWeight: EMPHASIZED_LABEL_WEIGHT,
          },
        },
        {
          id: "monster-stats",
          type: "stats-monster",
          props: { height: sy(179) },
        },
        {
          id: "monster-icon",
          type: "icon",
          bind: { iconKey: "iconAssetId" },
          when: { hasImage: "iconAssetId" },
          props: { size: savg(126), offsetX: sx(-4), offsetY: sy(-10) },
        },
      ],
    },
  ],
};

export const blueprintsByTemplateId: Partial<Record<TemplateId, Blueprint>> = {
  hero: HERO_BLUEPRINT,
  monster: MONSTER_BLUEPRINT,
  "small-treasure": SMALL_TREASURE_BLUEPRINT,
  "large-treasure": LARGE_TREASURE_BLUEPRINT,
  "hero-back": HERO_BACK_BLUEPRINT,
  "labelled-back": LABELLED_BACK_BLUEPRINT,
};

export function getCopyrightBounds(templateId: TemplateId): BlueprintBounds {
  if (templateId === "small-treasure" || templateId === "large-treasure") {
    return COPYRIGHT_BOUNDS_ARTWORK;
  }
  return COPYRIGHT_BOUNDS;
}
