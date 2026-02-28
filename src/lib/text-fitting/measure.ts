let measureCanvas: HTMLCanvasElement | null = null;

export function createTextMeasurer(
  fontSize: number,
  fontFamily: string,
  fontWeight?: number | string,
  fontStyle?: string,
): (text: string) => number {
  if (typeof document === "undefined") {
    const approxCharWidth = fontSize * 0.6;
    return (value: string) => value.length * approxCharWidth;
  }

  if (!measureCanvas) {
    measureCanvas = document.createElement("canvas");
  }

  const ctx = measureCanvas.getContext("2d");
  if (!ctx) {
    const approxCharWidth = fontSize * 0.6;
    return (value: string) => value.length * approxCharWidth;
  }

  const resolvedStyle = fontStyle ? `${fontStyle} ` : "";
  const resolvedWeight = fontWeight ? `${fontWeight} ` : "";
  const font = `${resolvedStyle}${resolvedWeight}${fontSize}px ${fontFamily}`;

  return (value: string) => {
    ctx.font = font;
    return ctx.measureText(value).width;
  };
}
