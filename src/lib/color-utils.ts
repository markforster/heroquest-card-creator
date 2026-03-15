export type Rgb = { r: number; g: number; b: number };

export function colorDistance(a: Rgb, b: Rgb) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
