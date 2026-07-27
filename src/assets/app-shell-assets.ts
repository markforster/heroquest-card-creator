import { embeddedImagesByFileName } from "@/generated/embeddedAssets";

export const appIconSrc =
  embeddedImagesByFileName["app-logo.png"] ?? "./assets/app-logo.png";

const helpCardShowcaseSrc =
  embeddedImagesByFileName["help-card-showcase.jpg"] ?? "./assets/help-card-showcase.jpg";

export const helpCardShowcaseCssBackground = `url("${helpCardShowcaseSrc}")`;
