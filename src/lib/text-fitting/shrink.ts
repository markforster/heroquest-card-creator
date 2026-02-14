function estimateTextWidth(text: string, fontSize: number): number {
  const approxCharWidth = fontSize * 0.6;
  return text.length * approxCharWidth;
}

export function shrinkToFitSingleLine(
  text: string,
  maxWidth: number,
  maxHeight: number,
  baseSize: number,
  minSize: number,
): number {
  if (!text) return baseSize;

  const widthAtBase = estimateTextWidth(text, baseSize);
  const widthScale = maxWidth / widthAtBase;
  const heightScale = maxHeight / baseSize;
  const scale = Math.min(1, widthScale, heightScale);
  const nextSize = Math.floor(baseSize * scale);
  return Math.max(minSize, nextSize);
}
