export type HeroBackLogoBounds = {
  width: number;
  height: number;
};

export function computeHeroBackLogoScale({
  bounds,
  imageWidth,
  imageHeight,
}: {
  bounds: HeroBackLogoBounds;
  imageWidth: number;
  imageHeight: number;
}) {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return 1;
  }
  const heightScale = bounds.height / imageHeight;
  const scaledWidth = imageWidth * heightScale;
  if (scaledWidth <= bounds.width) {
    return heightScale;
  }
  return bounds.width / imageWidth;
}

export function getHeroBackLogoPlacement({
  bounds,
  imageWidth,
  imageHeight,
}: {
  bounds: HeroBackLogoBounds & { x?: number; y?: number };
  imageWidth: number;
  imageHeight: number;
}) {
  const scale = computeHeroBackLogoScale({ bounds, imageWidth, imageHeight });
  const renderedWidth = imageWidth * scale;
  const renderedHeight = imageHeight * scale;
  const x = (bounds.x ?? 0) + (bounds.width - renderedWidth) / 2;
  const y = (bounds.y ?? 0) + (bounds.height - renderedHeight) / 2;

  return {
    scale,
    renderedWidth,
    renderedHeight,
    x,
    y,
  };
}
