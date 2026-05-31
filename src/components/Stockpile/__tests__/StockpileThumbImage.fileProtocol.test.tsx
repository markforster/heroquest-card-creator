import { render } from "@testing-library/react";

import StockpileThumbImage from "@/components/Stockpile/StockpileThumbImage";

jest.mock("@/lib/card-thumbnail-cache", () => ({
  useCardThumbnailUrl: jest.fn(),
}));

const { useCardThumbnailUrl } = jest.requireMock("@/lib/card-thumbnail-cache") as {
  useCardThumbnailUrl: jest.Mock;
};

describe("StockpileThumbImage file protocol fallback", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    useCardThumbnailUrl.mockReset();
  });

  it("normalizes template fallback URL in file protocol", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        origin: "null",
        protocol: "file:",
      },
    });
    useCardThumbnailUrl.mockReturnValue(null);

    const { container } = render(
      <StockpileThumbImage
        cardId="card-a"
        thumbnailBlob={null}
        templateThumbSrc="/_next/static/media/template.png"
      />,
    );

    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    expect(image?.getAttribute("src")).toBe("./_next/static/media/template.png");
  });

  it("keeps blob thumbnail URL unchanged", () => {
    useCardThumbnailUrl.mockReturnValue("blob:test-thumb");

    const { container } = render(
      <StockpileThumbImage
        cardId="card-a"
        thumbnailBlob={null}
        templateThumbSrc="/_next/static/media/template.png"
      />,
    );

    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    expect(image?.getAttribute("src")).toBe("blob:test-thumb");
  });
});
