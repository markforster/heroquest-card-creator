export type HeroBackLogoBounds = {
  width: number;
  height: number;
};

export type HeroBackLogoRotation = -90 | 0 | 90;

type HeroBackLogoImageBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  transform?: string;
};

export function computeHeroBackLogoScale({
  bounds,
  imageWidth,
  imageHeight,
  rotation = 0,
}: {
  bounds: HeroBackLogoBounds;
  imageWidth: number;
  imageHeight: number;
  rotation?: HeroBackLogoRotation;
}) {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return 1;
  }
  const isQuarterTurn = Math.abs(rotation) === 90;
  const visibleWidth = isQuarterTurn ? imageHeight : imageWidth;
  const visibleHeight = isQuarterTurn ? imageWidth : imageHeight;
  const heightScale = bounds.height / visibleHeight;
  const scaledWidth = visibleWidth * heightScale;
  if (scaledWidth <= bounds.width) {
    return heightScale;
  }
  return bounds.width / visibleWidth;
}

export function getHeroBackLogoPlacement({
  bounds,
  imageWidth,
  imageHeight,
  rotation = 0,
}: {
  bounds: HeroBackLogoBounds & { x?: number; y?: number };
  imageWidth: number;
  imageHeight: number;
  rotation?: HeroBackLogoRotation;
}) {
  const scale = computeHeroBackLogoScale({ bounds, imageWidth, imageHeight, rotation });
  const renderedWidth = imageWidth * scale;
  const renderedHeight = imageHeight * scale;
  const centerX = (bounds.x ?? 0) + bounds.width / 2;
  const centerY = (bounds.y ?? 0) + bounds.height / 2;
  const x = centerX - renderedWidth / 2;
  const y = centerY - renderedHeight / 2;
  const isQuarterTurn = Math.abs(rotation) === 90;
  const visibleWidth = isQuarterTurn ? renderedHeight : renderedWidth;
  const visibleHeight = isQuarterTurn ? renderedWidth : renderedHeight;
  const visibleBounds = {
    x: centerX - visibleWidth / 2,
    y: centerY - visibleHeight / 2,
    width: visibleWidth,
    height: visibleHeight,
  };

  let imageBox: HeroBackLogoImageBox = {
    x,
    y,
    width: renderedWidth,
    height: renderedHeight,
  };

  if (isQuarterTurn) {
    // Keep the source viewport inside the root SVG. Some SVG bitmap decoders clip
    // an out-of-bounds <image> before applying its rotation.
    const normalization = Math.max(imageWidth, imageHeight, 1);
    const localWidth = Math.max(imageWidth, 0) / normalization;
    const localHeight = Math.max(imageHeight, 0) / normalization;
    const localScale = scale * normalization;
    imageBox = {
      x: 0,
      y: 0,
      width: localWidth,
      height: localHeight,
      transform: [
        `translate(${centerX} ${centerY})`,
        `rotate(${rotation})`,
        `scale(${localScale})`,
        `translate(${-localWidth / 2} ${-localHeight / 2})`,
      ].join(" "),
    };
  }

  return {
    scale,
    renderedWidth,
    renderedHeight,
    visibleBounds,
    imageBox,
  };
}
