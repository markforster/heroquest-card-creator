import { getSvgImageHref, setSvgImageHref } from "@/lib/dom";

describe("svg image href helpers", () => {
  it("reads href attribute when present", () => {
    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttribute("href", "value");
    expect(getSvgImageHref(img)).toBe("value");
  });

  it("falls back to xlink href when href is missing", () => {
    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttributeNS("http://www.w3.org/1999/xlink", "href", "xlink-value");
    expect(getSvgImageHref(img)).toBe("xlink-value");
  });

  it("sets both href and xlink href", () => {
    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    setSvgImageHref(img, "new-value");
    expect(img.getAttribute("href")).toBe("new-value");
    expect(img.getAttributeNS("http://www.w3.org/1999/xlink", "href")).toBe("new-value");
  });
});
