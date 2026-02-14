import { insertSvgStyle } from "@/lib/dom";

describe("insertSvgStyle", () => {
  it("inserts a style element as the first child", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const existing = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    svg.appendChild(existing);

    insertSvgStyle(svg, ".cls { fill: red; }");

    expect(svg.firstChild?.nodeName).toBe("style");
    expect(svg.firstChild?.textContent).toBe(".cls { fill: red; }");
  });
});
