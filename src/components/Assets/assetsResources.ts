export const OFFICIAL_ARTWORK_PACK_URL =
  "https://github.com/markforster/heroquest-card-creator/releases/download/v0.4.2/Artwork.zip";

export const GPT_LINKS = [
  {
    href: "https://chatgpt.com/g/g-67716ef315cc8191bc2b325feea57fb6-heroquest-character-art-generator",
    titleKey: "empty.assetsGptArtTitle",
    metaKey: "empty.assetsGptArtMeta",
    bodyKey: "empty.assetsGptArtBody",
    ctaKey: "empty.assetsGptArtCta",
  },
  {
    href: "https://chatgpt.com/g/g-676f12d691588191822f9fc1ed782d9a-heroquest-card-art",
    titleKey: "empty.assetsGptCardArtTitle",
    metaKey: "empty.assetsGptCardArtMeta",
    bodyKey: "empty.assetsGptCardArtBody",
    ctaKey: "empty.assetsGptCardArtCta",
  },
  {
    href: "https://chatgpt.com/g/g-6771661d7b8c81918a04a667f4d67531-heroquest-character-icons-v1",
    titleKey: "empty.assetsGptIconsTitle",
    metaKey: "empty.assetsGptIconsMeta",
    bodyKey: "empty.assetsGptIconsBody",
    ctaKey: "empty.assetsGptIconsCta",
  },
] as const;

export const RESOURCES_MENU_LINKS = [
  {
    href: OFFICIAL_ARTWORK_PACK_URL,
    labelKey: "empty.assetsDownloadPackCta",
    icon: "download",
  },
  {
    href: GPT_LINKS[0].href,
    labelKey: GPT_LINKS[0].ctaKey,
    icon: "art-generator",
  },
  {
    href: GPT_LINKS[1].href,
    labelKey: GPT_LINKS[1].ctaKey,
    icon: "card-art",
  },
  {
    href: GPT_LINKS[2].href,
    labelKey: GPT_LINKS[2].ctaKey,
    icon: "icon-generator",
  },
] as const;

export type ResourceMenuIcon = (typeof RESOURCES_MENU_LINKS)[number]["icon"];
