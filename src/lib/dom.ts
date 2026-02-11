"use client";

export function getSvgImageHref(imgEl: SVGImageElement): string | null {
  return imgEl.getAttribute("href") ?? imgEl.getAttributeNS("http://www.w3.org/1999/xlink", "href");
}

export function setSvgImageHref(imgEl: SVGImageElement, href: string): void {
  imgEl.setAttribute("href", href);
  imgEl.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
}

export function insertSvgStyle(svgEl: SVGSVGElement, cssText: string): void {
  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = cssText;
  svgEl.insertBefore(styleEl, svgEl.firstChild);
}
