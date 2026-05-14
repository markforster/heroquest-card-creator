import { fireEvent, render } from "@testing-library/react";

import CardFan from "@/components/Decks/CardFan";

jest.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({
    setNodeRef: jest.fn(),
  }),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    isDragging: false,
  }),
}));

jest.mock("@/lib/card-thumbnail-cache", () => ({
  useCardThumbnailUrl: () => "blob:test-thumb",
}));

describe("CardFan render contract", () => {
  it("renders draggable set nodes and an inserted drop placeholder", () => {
    const { container } = render(
      <CardFan
        cardIds={["back-1", "back-2"]}
        variant="smMd"
        expanded
        dropPlaceholderIndex={1}
        getDragMeta={(cardId) => ({
          id: `set:${cardId}`,
          data: {
            type: "set",
            setId: `set-for-${cardId}`,
          },
        })}
      />,
    );

    const setNodes = Array.from(container.querySelectorAll("[data-set-id]"));
    const placeholderNodes = Array.from(container.querySelectorAll(".cardFanPlaceholderSvg"));

    expect(setNodes.map((node) => node.getAttribute("data-set-id"))).toEqual([
      "set-for-back-1",
      "set-for-back-2",
    ]);
    expect(placeholderNodes).toHaveLength(1);
  });

  it("uses deck-empty class for empty fan slots when requested", () => {
    const { container } = render(
      <CardFan
        cardIds={[]}
        variant="smMd"
        maxCount={5}
        showPlaceholdersWhenEmpty
        emptyPlaceholderVariant="deck-empty"
      />,
    );

    const emptyNodes = Array.from(container.querySelectorAll(".cardFanEmptyDeckPlaceholderSvg"));
    expect(emptyNodes).toHaveLength(5);
  });

  it("keeps drop placeholder styling separate from deck-empty styling", () => {
    const { container } = render(
      <CardFan
        cardIds={["back-1"]}
        variant="smMd"
        dropPlaceholderIndex={1}
        emptyPlaceholderVariant="deck-empty"
      />,
    );

    const dropNodes = Array.from(container.querySelectorAll(".cardFanPlaceholderSvg"));
    const emptyNodes = Array.from(container.querySelectorAll(".cardFanEmptyDeckPlaceholderSvg"));
    expect(dropNodes).toHaveLength(1);
    expect(emptyNodes).toHaveLength(0);
  });

  it("scales corner radius by variant size", () => {
    const { container: xsContainer } = render(
      <CardFan cardIds={["card-xs"]} variant="xs" />,
    );
    const { container: lgContainer } = render(
      <CardFan cardIds={["card-lg"]} variant="lg" />,
    );

    const xsClipRect = xsContainer.querySelector("clipPath rect");
    const lgClipRect = lgContainer.querySelector("clipPath rect");
    expect(xsClipRect).not.toBeNull();
    expect(lgClipRect).not.toBeNull();

    const xsRadius = Number(xsClipRect?.getAttribute("rx") ?? "0");
    const lgRadius = Number(lgClipRect?.getAttribute("rx") ?? "0");

    expect(xsRadius).toBeGreaterThan(0);
    expect(xsRadius).toBeLessThan(lgRadius);
  });

  it("uses the same radius for clip, hover, selected, and placeholder rects", () => {
    const { container } = render(
      <CardFan
        cardIds={["card-a"]}
        variant="sm"
        selectedCardId="card-a"
        enableHoverBorder
        showPlaceholdersWhenEmpty={false}
      />,
    );

    const clipRect = container.querySelector("clipPath rect");
    const hoverRect = container.querySelector(".cardFanHover");
    const selectedRect = container.querySelector(".cardFanSelected");
    expect(clipRect).not.toBeNull();
    expect(hoverRect).not.toBeNull();
    expect(selectedRect).not.toBeNull();

    const clipRadius = clipRect?.getAttribute("rx");
    expect(hoverRect?.getAttribute("rx")).toBe(clipRadius);
    expect(selectedRect?.getAttribute("rx")).toBe(clipRadius);

    const { container: emptyContainer } = render(
      <CardFan cardIds={[]} variant="sm" maxCount={1} showPlaceholdersWhenEmpty emptyPlaceholderVariant="deck-empty" />,
    );
    const emptyRect = emptyContainer.querySelector(".cardFanEmptyDeckPlaceholderSvg");
    expect(emptyRect?.getAttribute("rx")).toBe(clipRadius);
  });

  it("renders thumbnail fallback and fades image in after load", () => {
    const { container } = render(<CardFan cardIds={["card-a"]} variant="sm" />);

    const fallbackRect = container.querySelector(".cardFanThumbFallbackSvg");
    const imageNode = container.querySelector("image");
    expect(fallbackRect).not.toBeNull();
    expect(imageNode).not.toBeNull();
    expect(imageNode?.getAttribute("class")).toContain("cardFanThumbImage");

    fireEvent.load(imageNode as Element);
    expect(imageNode?.getAttribute("class")).toContain("cardFanThumbImageLoaded");
  });
});
