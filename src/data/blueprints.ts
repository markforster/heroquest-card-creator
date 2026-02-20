import smallLargeArtworkBorderMask from "@/assets/card-backgrounds/small-large-artwork-border-alpha-mask.png";
import smallLargeArtworkBorderTexture from "@/assets/card-backgrounds/small-large-artwork-border-blend-texture.png";
import whitePaperBackground from "@/assets/card-backgrounds/white-paper.png";
import type { Blueprint } from "@/types/blueprints";
import type { TemplateId } from "@/types/templates";

const DESCRIPTION_FONT_SIZE = 26;
const DESCRIPTION_LINE_HEIGHT = DESCRIPTION_FONT_SIZE * 1.05;
const DESCRIPTION_LETTER_SPACING = 0.02;

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
    },
    {
      id: "description",
      type: "text",
      bounds: {
        x: 125,
        y: 366,
        width: 500,
        height: 580,
      },
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
        // Known working values (previous)
        ribbonX: 81,
        ribbonY: 46,
        ribbonWidth: 588,
        ribbonHeight: 150.15,
        textX: 81,
        textY: 46,
        textWidth: 588,
        textHeight: 150.15,
        textNoRibbonX: 81,
        textNoRibbonY: 82,
        textNoRibbonWidth: 588,
        textNoRibbonHeight: 60.15,
        // Trial values (multiline experiment)
        // ribbonX: 81,
        // ribbonY: 46,
        // ribbonWidth: 588,
        // ribbonHeight: 150.15,
        // textX: 81,
        // textY: 46,
        // textWidth: 588,
        // textHeight: 150.15,
        // textNoRibbonX: 81,
        // textNoRibbonY: 78,
        // textNoRibbonWidth: 588,
        // textNoRibbonHeight: 96.15,
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
    },
    {
      id: "description",
      type: "text",
      bounds: {
        x: 125,
        y: 555,
        width: 500,
        height: 400,
      },
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
        // Known working values (previous)
        ribbonX: 81,
        ribbonY: 46,
        ribbonWidth: 588,
        ribbonHeight: 150.15,
        textX: 81,
        textY: 46,
        textWidth: 588,
        textHeight: 150.15,
        textNoRibbonX: 81,
        textNoRibbonY: 82,
        textNoRibbonWidth: 588,
        textNoRibbonHeight: 60.15,
        // Trial values (multiline experiment)
        // ribbonX: 81,
        // ribbonY: 46,
        // ribbonWidth: 588,
        // ribbonHeight: 150.15,
        // textX: 81,
        // textY: 46,
        // textWidth: 588,
        // textHeight: 150.15,
        // textNoRibbonX: 81,
        // textNoRibbonY: 78,
        // textNoRibbonWidth: 588,
        // textNoRibbonHeight: 96.15,
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
        ribbonX: 81,
        ribbonY: 866,
        ribbonWidth: 588,
        ribbonHeight: 150.15,
        textX: 171,
        textY: 888,
        textWidth: 428,
        textHeight: 58.15,
        textNoRibbonX: 81,
        textNoRibbonY: 888,
        textNoRibbonWidth: 588,
        textNoRibbonHeight: 58.15,
        textNoRibbonTopX: 81,
        textNoRibbonTopY: 82,
        textNoRibbonTopWidth: 588,
        textNoRibbonTopHeight: 58.15,
        ribbonTopX: 81,
        ribbonTopY: 46,
        ribbonTopWidth: 588,
        ribbonTopHeight: 150.15,
        textTopX: 171,
        textTopY: 68,
        textTopWidth: 428,
        textTopHeight: 58.15,
        // Trial values (multiline experiment)
        // ribbonX: 81,
        // ribbonY: 850,
        // ribbonWidth: 588,
        // ribbonHeight: 150.15,
        // textX: 171,
        // textY: 853,
        // textWidth: 428,
        // textHeight: 96.15,
      },
    },
    {
      id: "background-frame",
      type: "border",
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
      props: { fontSize: 34, letterSpacingEm: 0.02, align: "center" },
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
        // Known working values (previous)
        ribbonX: 81,
        ribbonY: 46,
        ribbonWidth: 588,
        ribbonHeight: 150.15,
        textX: 171,
        textY: 66,
        textWidth: 428,
        textHeight: 58.15,
        // Trial values (multiline experiment)
        // ribbonX: 81,
        // ribbonY: 46,
        // ribbonWidth: 588,
        // ribbonHeight: 150.15,
        // textX: 171,
        // textY: 47,
        // textWidth: 428,
        // textHeight: 96.15,
      },
    },
  ],
  groups: [
    {
      id: "hero-bottom-stack",
      type: "stack",
      anchor: "bottom",
      direction: "up",
      origin: { x: 65, y: 1020 },
      width: 620,
      gap: 2,
      children: [
        {
          id: "hero-description",
          type: "text",
          bind: { textKey: "description" },
          props: {
            fontSize: DESCRIPTION_FONT_SIZE,
            lineHeight: DESCRIPTION_LINE_HEIGHT,
            letterSpacingEm: DESCRIPTION_LETTER_SPACING,
            fontWeight: 550,
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
        // Known working values (previous)
        ribbonX: 81,
        ribbonY: 46,
        ribbonWidth: 588,
        ribbonHeight: 150.15,
        textX: 171,
        textY: 66,
        textWidth: 428,
        textHeight: 58.15,
        // Trial values (multiline experiment)
        // ribbonX: 81,
        // ribbonY: 46,
        // ribbonWidth: 588,
        // ribbonHeight: 150.15,
        // textX: 171,
        // textY: 47,
        // textWidth: 428,
        // textHeight: 96.15,
      },
    },
  ],
  groups: [
    {
      id: "monster-bottom-stack",
      type: "stack",
      anchor: "bottom",
      direction: "up",
      origin: { x: 65, y: 1020 },
      width: 620,
      gap: 2,
      children: [
        {
          id: "monster-description",
          type: "text",
          bind: { textKey: "description" },
          props: {
            fontSize: DESCRIPTION_FONT_SIZE,
            lineHeight: DESCRIPTION_LINE_HEIGHT,
            letterSpacingEm: DESCRIPTION_LETTER_SPACING,
            fontWeight: 550,
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
