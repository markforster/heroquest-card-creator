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
});
