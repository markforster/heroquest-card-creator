import smallLargeArtworkBorderMask from "@/assets/card-backgrounds/small-large-artwork-border-alpha-mask.png";
import smallLargeArtworkBorderTexture from "@/assets/card-backgrounds/small-large-artwork-border-blend-texture.png";
import whitePaperBackground from "@/assets/card-backgrounds/white-paper.png";
import { DEFAULT_COPYRIGHT_COLOR } from "@/config/colors";
import { EMPHASIZED_LABEL_WEIGHT } from "@/config/typography";
import type { Blueprint, BlueprintBounds } from "@/types/blueprints";
import type { TemplateId } from "@/types/templates";

const DESCRIPTION_FONT_SIZE = 32;
const DESCRIPTION_LINE_HEIGHT = DESCRIPTION_FONT_SIZE * 1.25;
const DESCRIPTION_LETTER_SPACING = 0.000015;
const HERO_MONSTER_BODY_FONT_SIZE = 26;
const HERO_MONSTER_BODY_LINE_HEIGHT = HERO_MONSTER_BODY_FONT_SIZE * 1.05;
const HERO_MONSTER_BODY_LETTER_SPACING = 0.000015;
const COPYRIGHT_FONT_SIZE = 20;
const COPYRIGHT_LINE_HEIGHT = 20;
const COPYRIGHT_HEIGHT = 22;
const COPYRIGHT_BOTTOM_MARGIN = 24;
const COPYRIGHT_STACK_GAP = 8;
const COPYRIGHT_BOUNDS = {
  x: 60,
  y: 1050 - COPYRIGHT_BOTTOM_MARGIN - COPYRIGHT_HEIGHT,
  width: 630,
  height: COPYRIGHT_HEIGHT,
};
const COPYRIGHT_BOUNDS_ARTWORK = {
  ...COPYRIGHT_BOUNDS,
  y: COPYRIGHT_BOUNDS.y - 56,
};
const HERO_MONSTER_STACK_ORIGIN_Y = COPYRIGHT_BOUNDS.y - COPYRIGHT_STACK_GAP;
const TREASURE_DESC_X = 120;
const TREASURE_DESC_WIDTH = 515;
const TREASURE_DESC_BOTTOM = 986;
const RIBBON_BOUNDS = { x: 86, y: 46, width: 578, height: 145.15 };
const RIBBON_TEXT_BOUNDS = { x: 171, y: 66, width: 428, height: 58.15 };
const RIBBON_TEXT_BOUNDS_NO_RIBBON = { x: 81, y: 82, width: 588, height: 60.15 };

const makeRibbonBounds = (overrides?: Partial<typeof RIBBON_BOUNDS>) => ({
  ...RIBBON_BOUNDS,
  ...(overrides ?? {}),
});

const makeRibbonTextBounds = (overrides?: Partial<typeof RIBBON_TEXT_BOUNDS>) => ({
  ...RIBBON_TEXT_BOUNDS,
  ...(overrides ?? {}),
});

const makeRibbonTextNoRibbonBounds = (
  overrides?: Partial<typeof RIBBON_TEXT_BOUNDS_NO_RIBBON>,
) => ({
  ...RIBBON_TEXT_BOUNDS_NO_RIBBON,
  ...(overrides ?? {}),
});

const makeTreasureDescBounds = (topY: number) => ({
  x: TREASURE_DESC_X,
  y: topY,
  width: TREASURE_DESC_WIDTH,
  height: TREASURE_DESC_BOTTOM - topY,
});

const SMALL_TREASURE_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  templateId: "small-treasure",
  canvas: { width: 750, height: 1050 },
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
      bounds: {
        x: 125,
        y: 166,
        width: 500,
        height: 180,
      },
      bind: { imageKey: "imageAssetId" },
      when: { hasImage: "imageAssetId" },
    },
    {
      id: "background-frame",
      type: "background",
      source: "template",
    },
    {
      id: "border-texture",
      type: "border",
      mask: smallLargeArtworkBorderMask,
      texture: smallLargeArtworkBorderTexture,
      blendMode: "multiply",
      offsetX: 1,
      offsetY: -1,
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
  canvas: { width: 750, height: 1050 },
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
      bounds: {
        x: 135,
        y: 158,
        width: 480,
        height: 352,
      },
      bind: { imageKey: "imageAssetId" },
      when: { hasImage: "imageAssetId" },
      props: { offsetX: 0, offsetY: 14 },
    },
    {
      id: "background-frame",
      type: "background",
      source: "template",
    },
    {
      id: "border-texture",
      type: "border",
      mask: smallLargeArtworkBorderMask,
      texture: smallLargeArtworkBorderTexture,
      blendMode: "multiply",
      offsetX: 1,
      offsetY: -1,
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
  canvas: { width: 750, height: 1050 },
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
      bounds: {
        x: 0,
        y: 0,
        width: 750,
        height: 1050,
      },
      bind: { imageKey: "imageAssetId" },
      when: { hasImage: "imageAssetId" },
    },
    {
      id: "description",
      type: "text",
      bounds: {
        x: 26,
        y: 24,
        width: 696,
        height: 784,
      },
      bind: { textKey: "description" },
      props: {
        fontSize: DESCRIPTION_FONT_SIZE,
        lineHeight: DESCRIPTION_LINE_HEIGHT,
        letterSpacingEm: DESCRIPTION_LETTER_SPACING,
        topX: 26,
        topY: 210,
        topWidth: 696,
        topHeight: 816,
        flushX: 0,
        flushY: 0,
        flushWidth: 750,
        flushHeight: 806,
        flushTopX: 0,
        flushTopY: 210,
        flushTopWidth: 750,
        flushTopHeight: 840,
        hiddenX: 26,
        hiddenY: 24,
        hiddenWidth: 696,
        hiddenHeight: 1002,
        flushHiddenX: 0,
        flushHiddenY: 0,
        flushHiddenWidth: 750,
        flushHiddenHeight: 1050,
        backdrop: true,
        backdropFill: "#ffffff",
        backdropOpacity: 0.55,
        backdropRadius: 30,
        backdropCornerMode: "opposite-title",
        backdropInsetMode: "matchBorder",
        backdropFitMode: "full",
        backdropWhenImageKey: "imageAssetId",
        textPadding: 24,
      },
    },
    {
      id: "title",
      type: "title",
      bind: { titleKey: "title" },
      props: {
        y: 866,
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
  canvas: { width: 750, height: 1050 },
  layers: [
    {
      id: "background",
      type: "background",
      source: "template",
    },
    {
      id: "description",
      type: "text",
      bounds: {
        x: 85,
        y: 303,
        width: 580,
        height: 480,
      },
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
  canvas: { width: 750, height: 1050 },
  layers: [
    {
      id: "background",
      type: "background",
      source: "template",
    },
    {
      id: "artwork",
      type: "image",
      bounds: {
        x: 10,
        y: 120,
        width: 730,
        height: 730,
      },
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
      origin: { x: 54, y: HERO_MONSTER_STACK_ORIGIN_Y },
      width: 636,
      gap: 2,
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
          props: { height: 170 },
        },
      ],
    },
  ],
};

const MONSTER_BLUEPRINT: Blueprint = {
  schemaVersion: 1,
  templateId: "monster",
  canvas: { width: 750, height: 1050 },
  layers: [
    {
      id: "background",
      type: "background",
      source: "template",
    },
    {
      id: "artwork",
      type: "image",
      bounds: {
        x: 10,
        y: 120,
        width: 730,
        height: 730,
      },
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
      origin: { x: 48, y: HERO_MONSTER_STACK_ORIGIN_Y },
      width: 652,
      gap: 2,
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
          props: { height: 179 },
        },
        {
          id: "monster-icon",
          type: "icon",
          bind: { iconKey: "iconAssetId" },
          when: { hasImage: "iconAssetId" },
          props: { size: 126, offsetX: -4, offsetY: -10 },
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
