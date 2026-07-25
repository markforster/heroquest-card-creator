"use client";

function getSvgViewBox(svg: SVGSVGElement) {
  const liveViewBox = svg.viewBox?.baseVal;
  if (liveViewBox && liveViewBox.width > 0 && liveViewBox.height > 0) {
    return liveViewBox;
  }

  const viewBoxAttr = svg.getAttribute("viewBox");
  if (viewBoxAttr) {
    const [x = 0, y = 0, width = 1, height = 1] = viewBoxAttr
      .trim()
      .split(/[\s,]+/)
      .map((value) => Number(value));
    return { x, y, width, height };
  }

  return { x: 0, y: 0, width: 1, height: 1 };
}

export function getStagePointFromClientCoordinates({
  svg,
  clientX,
  clientY,
}: {
  svg: SVGSVGElement;
  clientX: number;
  clientY: number;
}) {
  const ctm = svg.getScreenCTM?.();
  const point = svg.createSVGPoint?.();

  if (ctm && point) {
    point.x = clientX;
    point.y = clientY;
    const transformed = point.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  const rect = svg.getBoundingClientRect();
  const viewBox = getSvgViewBox(svg);
  const width = rect.width || viewBox.width || 1;
  const height = rect.height || viewBox.height || 1;
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;

  return {
    x: viewBox.x + (localX / width) * viewBox.width,
    y: viewBox.y + (localY / height) * viewBox.height,
  };
}
