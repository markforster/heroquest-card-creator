export function computeAverageLuminance(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  if (!totalPixels) return 1;

  let sum = 0;
  let counted = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    if (alpha <= 0) {
      continue;
    }
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    const rl = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gl = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bl = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    const luminance = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
    sum += luminance;
    counted += 1;
  }

  if (!counted) return 1;
  return sum / counted;
}
