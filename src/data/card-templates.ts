import borderedMask from "@/assets/card-backgrounds/bordered-mask.png";
import heroBackBackground from "@/assets/card-backgrounds/hero-back.png";
import largeWindowBackground from "@/assets/card-backgrounds/large-window.png";
import parchmentBackground from "@/assets/card-backgrounds/parchment.png";
import smallWindowBackground from "@/assets/card-backgrounds/small-window.png";
import heroBackThumbnail from "@/assets/template-thumbnails/hero-back.png";
import heroThumbnail from "@/assets/template-thumbnails/hero.png";
import labelledBackThumbnail from "@/assets/template-thumbnails/labelled-back.png";
import largeTreasureThumbnail from "@/assets/template-thumbnails/large-treasure.png";
import monsterThumbnail from "@/assets/template-thumbnails/monster.png";
import smallTreasureThumbnail from "@/assets/template-thumbnails/small-treasure.png";
import HeroBackTemplate from "@/components/CardTemplates/HeroBackTemplate";
import HeroCardTemplate from "@/components/CardTemplates/HeroCardTemplate";
import LabelledBackTemplate from "@/components/CardTemplates/LabelledBackTemplate";
import LargeTreasureTemplate from "@/components/CardTemplates/LargeTreasureTemplate";
import MonsterCardTemplate from "@/components/CardTemplates/MonsterCardTemplate";
import SmallTreasureTemplate from "@/components/CardTemplates/SmallTreasureTemplate";
import type { CardTemplateComponent, CardTemplateMeta, TemplateId } from "@/types/templates";

export const cardTemplates: CardTemplateMeta[] = [
  {
    id: "hero",
    name: "Hero Card",
    kind: "character",
    description: "Character-style card with full stats row and large hero artwork.",
    thumbnail: heroThumbnail,
    background: parchmentBackground,
  },
  {
    id: "monster",
    name: "Monster Card",
    kind: "monster",
    description: "Monster card with stats and dedicated icon area.",
    thumbnail: monsterThumbnail,
    background: parchmentBackground,
  },
  {
    id: "small-treasure",
    name: "Small Artwork Card",
    kind: "treasure",
    description: "Card with smaller artwork window and large rules text area.",
    thumbnail: smallTreasureThumbnail,
    background: smallWindowBackground,
  },
  {
    id: "large-treasure",
    name: "Large Artwork Card",
    kind: "treasure",
    description: "Card with large artwork area and supporting rules text.",
    thumbnail: largeTreasureThumbnail,
    background: largeWindowBackground,
  },
  {
    id: "hero-back",
    name: "Hero Back",
    kind: "back",
    description: "Simple back design for hero or character decks.",
    thumbnail: heroBackThumbnail,
    background: heroBackBackground,
  },
  {
    id: "labelled-back",
    name: "Labelled Back",
    kind: "back",
    description: "Back design with a label/banner, e.g. 'Card Back'.",
    thumbnail: labelledBackThumbnail,
    background: borderedMask,
  },
];

export const cardTemplatesById: Record<string, CardTemplateMeta> = Object.fromEntries(
  cardTemplates.map((tpl) => [tpl.id, tpl]),
);

export const templateComponentsById: Record<TemplateId, CardTemplateComponent> = {
  hero: HeroCardTemplate,
  monster: MonsterCardTemplate,
  "small-treasure": SmallTreasureTemplate,
  "large-treasure": LargeTreasureTemplate,
  "hero-back": HeroBackTemplate,
  "labelled-back": LabelledBackTemplate,
};
