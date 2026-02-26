import { fireEvent, render, screen } from "@testing-library/react";

import StockpileCardsGrid from "@/components/Stockpile/StockpileCardsGrid";
import type { StockpileCardView } from "@/components/Stockpile/types";

jest.mock("@/components/common/CardThumbnail", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div data-testid="thumb">{alt}</div>,
}));

describe("StockpileCardsGrid (UI)", () => {
  it("renders checkbox reflecting selection and triggers onCardSetSelected", () => {
    const onCardSetSelected = jest.fn();
    const item: StockpileCardView = {
      id: "card-1",
      name: "Card 1",
      templateId: "hero",
      templateLabel: "Hero",
      effectiveFace: "front",
      faceLabel: "Front",
      facePillLabel: "Front",
      updatedLabel: "Today",
      timeLabel: "Now",
      thumbnailBlob: null,
      templateThumbSrc: null,
      paired: { back: null, fronts: [], frontsVisible: [], frontsOverflow: 0 },
      isSelected: true,
      isPairingConflict: false,
    };

    render(
      <StockpileCardsGrid
        items={[item]}
        isPairMode={false}
        conflictPopoverCardId={null}
        actions={{
          onCardClick: jest.fn(),
          onCardSetSelected,
          onCardSelectSingle: jest.fn(),
          onCardDoubleClick: jest.fn(),
          onPairHoverEnter: jest.fn(),
          onPairHoverLeave: jest.fn(),
          onTableThumbEnter: jest.fn(),
          onTableThumbLeave: jest.fn(),
          onConflictHoverEnter: jest.fn(),
          onConflictHoverLeave: jest.fn(),
        }}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Select Card 1" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    fireEvent.change(checkbox, { target: { checked: false } });
    expect(onCardSetSelected).toHaveBeenCalledWith("card-1", false, false, false);
  });
});

