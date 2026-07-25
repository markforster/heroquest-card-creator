import { embeddedImagesByFileName } from "@/generated/embeddedAssets";

export const appIconSrc =
  embeddedImagesByFileName["apple-touch-icon.png"] ?? "./assets/apple-touch-icon.png";

const helpCardShowcaseSrc =
  embeddedImagesByFileName["help-card-showcase.jpg"] ?? "./assets/help-card-showcase.jpg";

export const helpCardShowcaseCssBackground = `url("${helpCardShowcaseSrc}")`;
