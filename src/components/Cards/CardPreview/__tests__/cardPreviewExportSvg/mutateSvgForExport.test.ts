import { CARD_HEIGHT, CARD_WIDTH } from "@/components/Cards/CardPreview/consts";
import { mutateSvgForExport } from "@/components/Cards/CardPreview/cardPreviewExportSvg";

function createSvg() {
  return document.createElementNS("http://www.w3.org/2000/svg", "svg");
}

describe("mutateSvgForExport", () => {
  it("removes the outline layer", () => {
    const svg = createSvg();
    const outline = document.createElementNS(svg.namespaceURI, "rect");
    outline.setAttribute("data-card-outline", "true");
    svg.appendChild(outline);

    mutateSvgForExport(svg, { mode: "standard" });

    expect(svg.querySelector('[data-card-outline="true"]')).toBeNull();
  });

  it("applies an export clip to unclipped image nodes", () => {
    const svg = createSvg();
    const defs = document.createElementNS(svg.namespaceURI, "defs");
    svg.appendChild(defs);
    const image = document.createElementNS(svg.namespaceURI, "image");
    const feImage = document.createElementNS(svg.namespaceURI, "feImage");
    const preclipped = document.createElementNS(svg.namespaceURI, "image");
    preclipped.setAttribute("clip-path", "url(#existing)");
    svg.append(image, feImage, preclipped);

    mutateSvgForExport(svg, { mode: "standard" });

    const clipRect = svg.querySelector("clipPath#exportImageClip rect");
    expect(clipRect?.getAttribute("width")).toBe(String(CARD_WIDTH));
    expect(clipRect?.getAttribute("height")).toBe(String(CARD_HEIGHT));
    expect(image.getAttribute("clip-path")).toBe("url(#exportImageClip)");
    expect(feImage.getAttribute("clip-path")).toBe("url(#exportImageClip)");
    expect(preclipped.getAttribute("clip-path")).toBe("url(#existing)");
  });

  it("normalizes the card clip rect for bleed/full export", () => {
    const svg = createSvg();
    const defs = document.createElementNS(svg.namespaceURI, "defs");
    const clipPath = document.createElementNS(svg.namespaceURI, "clipPath");
    clipPath.setAttribute("id", "cardClip");
    const rect = document.createElementNS(svg.namespaceURI, "rect");
    rect.setAttribute("x", "8");
    rect.setAttribute("y", "9");
    rect.setAttribute("width", "100");
    rect.setAttribute("height", "200");
    rect.setAttribute("rx", "12");
    rect.setAttribute("ry", "14");
    clipPath.appendChild(rect);
    defs.appendChild(clipPath);
    svg.appendChild(defs);

    mutateSvgForExport(svg, { mode: "bleed-full", roundedCorners: false });

    expect(rect.getAttribute("x")).toBe("0");
    expect(rect.getAttribute("y")).toBe("0");
    expect(rect.getAttribute("width")).toBe(String(CARD_WIDTH));
    expect(rect.getAttribute("height")).toBe(String(CARD_HEIGHT));
    expect(rect.getAttribute("rx")).toBe("0");
    expect(rect.getAttribute("ry")).toBe("0");
  });

  it("zeros treasure border offsets for treasure templates", () => {
    const svg = createSvg();
    const borderMask = document.createElementNS(svg.namespaceURI, "image");
    borderMask.setAttribute("data-template-asset", "border-mask");
    borderMask.setAttribute("x", "10");
    borderMask.setAttribute("y", "20");
    const borderTexture = document.createElementNS(svg.namespaceURI, "image");
    borderTexture.setAttribute("data-template-asset", "border-texture");
    borderTexture.setAttribute("x", "30");
    borderTexture.setAttribute("y", "40");
    svg.append(borderMask, borderTexture);

    mutateSvgForExport(svg, { mode: "standard", templateId: "small-treasure" });

    expect(borderMask.getAttribute("x")).toBe("0");
    expect(borderMask.getAttribute("y")).toBe("0");
    expect(borderTexture.getAttribute("x")).toBe("0");
    expect(borderTexture.getAttribute("y")).toBe("0");
  });

  it("removes the developer-credit layer when enabled", () => {
    const svg = createSvg();
    const developerCredit = document.createElementNS(svg.namespaceURI, "g");
    developerCredit.setAttribute("data-layer-type", "developer-credit");
    svg.appendChild(developerCredit);

    mutateSvgForExport(svg, {
      mode: "standard",
      developerCreditEnabled: true,
    });

    expect(svg.querySelector('[data-layer-type="developer-credit"]')).toBeNull();
  });
});
