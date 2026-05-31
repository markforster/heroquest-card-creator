import { render, screen } from "@testing-library/react";

import DeckDetailHeader from "@/components/Decks/detail/DeckDetailHeader";

const mockCardFan = jest.fn();

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock("@/components/Decks/CardFan", () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockCardFan(props);
    return <div data-testid="deck-title-fan" />;
  },
}));

jest.mock("@/components/Decks/DeckExportButton", () => ({
  __esModule: true,
  default: () => <button type="button">Export</button>,
}));

describe("DeckDetailHeader", () => {
  beforeEach(() => {
    mockCardFan.mockReset();
  });

  it("renders fan prefix before deck title", () => {
    render(
      <DeckDetailHeader
        deckId="deck-1"
        deckTitle="My Deck"
        deckPreviewCardIds={["back-2", "back-1"]}
      />,
    );

    expect(screen.getByTestId("deck-title-fan")).toBeInTheDocument();
    expect(screen.getByText("My Deck")).toBeInTheDocument();
    expect(mockCardFan).toHaveBeenCalledWith(
      expect.objectContaining({
        cardIds: ["back-2", "back-1"],
        variant: "xs",
      }),
    );
  });
});
