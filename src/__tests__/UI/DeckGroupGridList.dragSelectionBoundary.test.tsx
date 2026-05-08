import { render, screen } from "@testing-library/react";

import DeckGroupGridList from "@/components/Decks/DeckGroupGridList";

jest.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({ setNodeRef: jest.fn(), isOver: false }),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  }),
}));

jest.mock("@/components/Decks/CardFan", () => {
  const MockCardFan = ({
    cardIds,
    expanded,
    dropPlaceholderIndex,
  }: {
    cardIds: string[];
    expanded?: boolean;
    dropPlaceholderIndex?: number | null;
  }) => (
    <div
      data-testid="mock-card-fan"
      data-card-ids={cardIds.join(",")}
      data-expanded={expanded ? "true" : "false"}
      data-drop-placeholder-index={dropPlaceholderIndex == null ? "" : String(dropPlaceholderIndex)}
    >
      {cardIds.join(",")}
    </div>
  );

  return {
    __esModule: true,
    default: MockCardFan,
    CARD_FAN_SIZES: {
      smMd: { width: 105, height: 147 },
    },
  };
});

describe("DeckGroupGridList drag selection boundary", () => {
  it("renders provided empty-group guidance copy", () => {
    render(
      <DeckGroupGridList
        groups={[] as never}
        sets={[] as never}
        selectedGroupId={null}
        selectedSetId={null}
        isDropOver={false}
        emptyLabel="Drag a back face from the right panel to create your first group."
        onSelectGroup={jest.fn()}
        onSelectSet={jest.fn()}
        groupTileVariant="smMd"
      />,
    );
    expect(
      screen.getByText("Drag a back face from the right panel to create your first group."),
    ).toBeInTheDocument();
  });

  it("keeps selected styling on committed group while back-face drag hover reveals another multi-set group", () => {
    const { container } = render(
      <DeckGroupGridList
        groups={[
          { id: "group-1", title: "Group 1", sortIndex: 0 },
          { id: "group-2", title: "Group 2", sortIndex: 1 },
        ] as never}
        sets={[
          { id: "set-1", groupId: "group-1", sortIndex: 0, backFaceId: "back-1" },
          { id: "set-2", groupId: "group-2", sortIndex: 0, backFaceId: "back-2" },
          { id: "set-3", groupId: "group-2", sortIndex: 1, backFaceId: "back-3" },
        ] as never}
        selectedGroupId="group-1"
        selectedSetId="set-1"
        isDropOver={false}
        isBackFaceDragActive
        backFaceDropGroupId="group-2"
        backFaceDropIndex={1}
        dragTargetGroupId="group-2"
        emptyLabel="Empty"
        onSelectGroup={jest.fn()}
        onSelectSet={jest.fn()}
        groupTileVariant="smMd"
      />,
    );

    const selectedGroup = screen.getByText("Group 1").closest("[data-group-id]");
    const temporaryTargetGroup = screen.getByText("Group 2").closest("[data-group-id]");
    const targetFan = Array.from(container.querySelectorAll('[data-testid="mock-card-fan"]')).find(
      (node) => node.getAttribute("data-card-ids") === "back-2,back-3",
    );

    expect(selectedGroup?.className).toContain("deckNavItemSelected");
    expect(temporaryTargetGroup?.className).not.toContain("deckNavItemSelected");
    expect(targetFan?.getAttribute("data-expanded")).toBe("true");
    expect(targetFan?.getAttribute("data-drop-placeholder-index")).toBe("1");
  });

  it("does not drag-reveal single-set groups during back-face drag hover", () => {
    const { container } = render(
      <DeckGroupGridList
        groups={[{ id: "group-1", title: "Group 1", sortIndex: 0 }] as never}
        sets={[{ id: "set-1", groupId: "group-1", sortIndex: 0, backFaceId: "back-1" }] as never}
        selectedGroupId={null}
        selectedSetId={null}
        isDropOver={false}
        isBackFaceDragActive
        dragTargetGroupId="group-1"
        emptyLabel="Empty"
        onSelectGroup={jest.fn()}
        onSelectSet={jest.fn()}
        groupTileVariant="smMd"
      />,
    );
    const fan = container.querySelector('[data-testid="mock-card-fan"]');
    expect(fan?.getAttribute("data-expanded")).toBe("false");
  });

  it("fully expands a collapsed multi-set destination group during set drag hover", () => {
    const { container } = render(
      <DeckGroupGridList
        groups={[
          { id: "group-1", title: "Group 1", sortIndex: 0 },
          { id: "group-2", title: "Group 2", sortIndex: 1 },
        ] as never}
        sets={[
          { id: "set-1", groupId: "group-1", sortIndex: 0, backFaceId: "back-1" },
          { id: "set-2", groupId: "group-2", sortIndex: 0, backFaceId: "back-2" },
          { id: "set-3", groupId: "group-2", sortIndex: 1, backFaceId: "back-3" },
        ] as never}
        selectedGroupId="group-1"
        selectedSetId="set-1"
        isDropOver={false}
        isSetDragActive
        dragTargetGroupId="group-2"
        setDropGroupId="group-2"
        setDropIndex={1}
        emptyLabel="Empty"
        onSelectGroup={jest.fn()}
        onSelectSet={jest.fn()}
        groupTileVariant="smMd"
      />,
    );

    const targetFan = Array.from(container.querySelectorAll('[data-testid="mock-card-fan"]')).find(
      (node) => node.getAttribute("data-card-ids") === "back-2,back-3",
    );

    expect(targetFan?.getAttribute("data-expanded")).toBe("true");
    expect(targetFan?.getAttribute("data-drop-placeholder-index")).toBe("1");
  });

  it("clears temporary drag reveal when drag target is removed", () => {
    const props = {
      groups: [
        { id: "group-1", title: "Group 1", sortIndex: 0 },
        { id: "group-2", title: "Group 2", sortIndex: 1 },
      ] as never,
      sets: [
        { id: "set-1", groupId: "group-1", sortIndex: 0, backFaceId: "back-1" },
        { id: "set-2", groupId: "group-2", sortIndex: 0, backFaceId: "back-2" },
        { id: "set-3", groupId: "group-2", sortIndex: 1, backFaceId: "back-3" },
      ] as never,
      selectedGroupId: "group-1",
      selectedSetId: "set-1",
      isDropOver: false,
      isBackFaceDragActive: true,
      emptyLabel: "Empty",
      onSelectGroup: jest.fn(),
      onSelectSet: jest.fn(),
      groupTileVariant: "smMd" as const,
    };
    const { container, rerender } = render(
      <DeckGroupGridList {...props} dragTargetGroupId="group-2" />,
    );
    const revealedFan = Array.from(container.querySelectorAll('[data-testid="mock-card-fan"]')).find(
      (node) => node.getAttribute("data-card-ids") === "back-2,back-3",
    );
    expect(revealedFan?.getAttribute("data-expanded")).toBe("true");

    rerender(<DeckGroupGridList {...props} dragTargetGroupId={null} />);
    const collapsedFan = Array.from(container.querySelectorAll('[data-testid="mock-card-fan"]')).find(
      (node) => node.getAttribute("data-card-ids") === "back-2,back-3",
    );
    expect(collapsedFan?.getAttribute("data-expanded")).toBe("false");
  });

  it("does not render a pinned right-edge new-group zone during back-face drag", () => {
    const { container } = render(
      <DeckGroupGridList
        groups={[{ id: "group-1", title: "Group 1", sortIndex: 0 }] as never}
        sets={[{ id: "set-1", groupId: "group-1", sortIndex: 0, backFaceId: "back-1" }] as never}
        selectedGroupId="group-1"
        selectedSetId="set-1"
        isDropOver={false}
        isBackFaceDragActive
        isBackFaceNewGroupEdgeTarget
        emptyLabel="Empty"
        onSelectGroup={jest.fn()}
        onSelectSet={jest.fn()}
        groupTileVariant="smMd"
      />,
    );

    expect(container.querySelector('[data-pinned-new-group-zone="true"]')).toBeNull();
    expect(container.querySelectorAll("[data-drop-index]")).toHaveLength(1);
  });
});
