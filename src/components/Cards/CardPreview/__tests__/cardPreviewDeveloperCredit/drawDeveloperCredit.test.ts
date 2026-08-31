const measureCardTextMaxLineWidth = jest.fn(() => ({ maxLineWidth: 42 }));
const getBleedTrimOrigin = jest.fn(() => ({ trimX: 3, trimY: 4 }));
const resolveCopyrightTextStyle = jest.fn(() => ({ fontSize: 20 }));

jest.mock("@/components/Cards/CardParts/CardTextBlock", () => ({
  measureCardTextMaxLineWidth: (...args: unknown[]) => measureCardTextMaxLineWidth(...args),
}));

jest.mock("@/lib/bleed-export", () => ({
  getBleedTrimOrigin: (...args: unknown[]) => getBleedTrimOrigin(...args),
}));

jest.mock("@/components/Cards/CardPreview/cardPreviewCopyright", () => ({
  resolveCopyrightTextStyle: (...args: unknown[]) => resolveCopyrightTextStyle(...args),
}));

import { drawDeveloperCredit } from "@/components/Cards/CardPreview/cardPreviewDeveloperCredit";
import { CARD_CORNER_RADIUS, CARD_WIDTH } from "@/components/Cards/CardPreview/consts";
import { DEVELOPER_CREDIT_TEXT } from "@/config/developer-credit";

describe("drawDeveloperCredit", () => {
  const context = {
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    fillText: jest.fn(),
    font: "",
    textAlign: "start",
    textBaseline: "alphabetic",
    fillStyle: "",
    globalCompositeOperation: "source-over",
    globalAlpha: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does nothing without both a template and card data", () => {
    const canvas = document.createElement("canvas");
    const getContext = jest.spyOn(canvas, "getContext");

    drawDeveloperCredit({ canvas, templateId: "hero", bleedPx: 0 });

    expect(getContext).not.toHaveBeenCalled();
  });

  it("does nothing when the canvas context is unavailable", () => {
    const canvas = document.createElement("canvas");
    jest.spyOn(canvas, "getContext").mockReturnValue(null);

    drawDeveloperCredit({ canvas, templateId: "hero", cardData: {}, bleedPx: 0 });

    expect(measureCardTextMaxLineWidth).not.toHaveBeenCalled();
  });

  it("draws rotated credit text relative to the bleed trim origin", () => {
    const canvas = document.createElement("canvas");
    jest.spyOn(canvas, "getContext").mockReturnValue(context as never);
    const cropMarks = { enabled: true, color: "#000000" };

    drawDeveloperCredit({
      canvas,
      templateId: "hero",
      cardData: {},
      bleedPx: 12,
      cropMarks,
    });

    expect(resolveCopyrightTextStyle).toHaveBeenCalledWith("hero");
    expect(getBleedTrimOrigin).toHaveBeenCalledWith({
      bleedPx: 12,
      cropMarks,
      cutMarks: undefined,
    });
    expect(context.translate).toHaveBeenCalledWith(
      3 + CARD_WIDTH - 18,
      4 + Math.max(18, CARD_CORNER_RADIUS + 2) + 42,
    );
    expect(context.rotate).toHaveBeenCalledWith(-Math.PI / 2);
    expect(context.fillText).toHaveBeenCalledWith(DEVELOPER_CREDIT_TEXT, 0, 0);
    expect(context.save).toHaveBeenCalledTimes(1);
    expect(context.restore).toHaveBeenCalledTimes(1);
  });
});
