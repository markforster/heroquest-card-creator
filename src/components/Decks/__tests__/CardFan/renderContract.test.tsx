import { render } from "@testing-library/react";

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
});
