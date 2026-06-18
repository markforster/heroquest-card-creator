export const blueprintIds = {
  // 2021 HQ System
  hq_2021_background_base: "hq.2021.background.base",
  hq_2021_background_frame: "hq.2021.background.frame",
  hq_2021_border_frame: "hq.2021.border.frame",
  hq_2021_border_texture: "hq.2021.border.texture",
  hq_2021_image_main: "hq.2021.image.main",
  hq_2021_overlay_artwork_frame: "hq.2021.overlay.artwork.frame",
  hq_2021_overlay_border: "hq.2021.overlay.border",
  hq_2021_text_body: "hq.2021.text.body",
  hq_2021_text_copyright: "hq.2021.text.copyright",
  hq_2021_title_main: "hq.2021.title.main",
  hq_2021_group_hero_bottom_stack: "hq.2021.group.hero.bottom-stack",
  hq_2021_group_monster_bottom_stack: "hq.2021.group.monster.bottom-stack",
  hq_2021_stats_hero_primary: "hq.2021.stats.hero.primary",
  hq_2021_stats_monster_primary: "hq.2021.stats.monster.primary",
  hq_2021_icon_monster_primary: "hq.2021.icon.monster.primary",
  // others
  // ...
} as const;

export const layerTypes = {
  // 2021 HQ System
  background: "background",
  border: "border",
  image: "image",
  text: "text",
  title: "title",
  overlay: "overlay",
  icon: "icon",
  stats_hero: "stats-hero",
  stats_monster: "stats-monster",
  copyright: "copyright",
  // others
  // ...
} as const;

export const groupTypes = {
  stack: "stack",
} as const;

export const systemFamilies = {
  hq_2021: "hq.2021",
} as const;

export type BlueprintSlotId = (typeof blueprintIds)[keyof typeof blueprintIds];
export type BlueprintLayerTypeValue = (typeof layerTypes)[keyof typeof layerTypes];
export type BlueprintGroupTypeValue = (typeof groupTypes)[keyof typeof groupTypes];
export type SystemFamily = (typeof systemFamilies)[keyof typeof systemFamilies];
