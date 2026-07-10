import { fireEvent, render, screen } from "@testing-library/react";

import StockpileCardsGrid from "@/components/Stockpile/StockpileCardsGrid";
import type {
  StockpileCardActions,
  StockpileCardGroupView,
  StockpileCardView,
} from "@/components/Stockpile/types";

jest.mock("@/components/common/CardThumbnail/RemoteCardThumbnail", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div data-testid="thumb">{alt}</div>,
}));
jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    language: "en",
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "aria.selectCard": "Select {name}",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("StockpileCardsGrid (UI)", () => {
  function buildCard(overrides?: Partial<StockpileCardView>): StockpileCardView {
    return {
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
      isSelected: false,
      ...overrides,
    };
  }

  function renderGrid(item: StockpileCardView, actionOverrides?: Partial<StockpileCardActions>) {
    const actions = {
      onCardClick: jest.fn(),
      onCardSetSelected: jest.fn(),
      onCardSelectSingle: jest.fn(),
      onCardDoubleClick: jest.fn(),
      onPairHoverEnter: jest.fn(),
      onPairHoverLeave: jest.fn(),
      onTableThumbEnter: jest.fn(),
      onTableThumbLeave: jest.fn(),
      ...actionOverrides,
    };

    render(
      <StockpileCardsGrid
        items={[item]}
        isPairMode={false}
        dragEnabled={false}
        onClearSelection={jest.fn()}
        actions={actions}
      />,
    );

    return actions;
  }

  it("renders the simplified resting-state card with title and type pills only", () => {
    renderGrid(buildCard());

    expect(screen.getByTestId("stockpile-card-top-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("stockpile-card-bottom-toolbar")).toBeInTheDocument();
    expect(screen.getByTitle("Card 1")).toBeInTheDocument();
    expect(screen.getByText("Hero")).toBeInTheDocument();
    expect(screen.getByTestId("thumb")).toHaveTextContent("Card 1");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Today Now")).not.toBeInTheDocument();
  });

  it("preserves click, keyboard selection, and double-click behavior on the card shell", () => {
    const actions = renderGrid(buildCard({ isSelected: true }));
    const card = screen.getByLabelText("Card 1");

    fireEvent.click(card);
    expect(actions.onCardClick).toHaveBeenCalledWith("card-1", expect.any(Object), false);

    fireEvent.keyDown(card, { key: "Enter" });
    expect(actions.onCardSelectSingle).toHaveBeenCalledWith("card-1");

    fireEvent.keyDown(card, { key: " " });
    expect(actions.onCardSetSelected).toHaveBeenCalledWith("card-1", false, false);

    fireEvent.doubleClick(card);
    expect(actions.onCardDoubleClick).toHaveBeenCalledWith("card-1");
  });

  it("keeps pair-mode card click behavior unchanged", () => {
    const onCardClick = jest.fn();
    const item = buildCard();

    render(
      <StockpileCardsGrid
        items={[item]}
        isPairMode
        dragEnabled={false}
        onClearSelection={jest.fn()}
        actions={{
          onCardClick,
          onCardSetSelected: jest.fn(),
          onCardSelectSingle: jest.fn(),
          onCardDoubleClick: jest.fn(),
          onPairHoverEnter: jest.fn(),
          onPairHoverLeave: jest.fn(),
          onTableThumbEnter: jest.fn(),
          onTableThumbLeave: jest.fn(),
        }}
      />,
    );

    fireEvent.click(screen.getByLabelText("Card 1"));
    expect(onCardClick).toHaveBeenCalledWith("card-1", expect.any(Object), true);
  });

  it("renders grouped sections when grouped cards are provided", () => {
    const item = buildCard();
    const groups: StockpileCardGroupView[] = [{ id: "hero", label: "Hero", cards: [item] }];

    render(
      <StockpileCardsGrid
        items={[item]}
        groups={groups}
        isPairMode={false}
        dragEnabled={false}
        onClearSelection={jest.fn()}
        actions={{
          onCardClick: jest.fn(),
          onCardSetSelected: jest.fn(),
          onCardSelectSingle: jest.fn(),
          onCardDoubleClick: jest.fn(),
          onPairHoverEnter: jest.fn(),
          onPairHoverLeave: jest.fn(),
          onTableThumbEnter: jest.fn(),
          onTableThumbLeave: jest.fn(),
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Hero" })).toBeInTheDocument();
    expect(screen.getByLabelText("Card 1")).toBeInTheDocument();
  });
});
