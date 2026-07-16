import { fireEvent, render, screen } from "@testing-library/react";

import SavedCardTile from "@/components/common/SavedCardTile";

jest.mock("@/components/common/CardTitlePill", () => ({
  __esModule: true,
  default: ({ active, text }: { active?: boolean; text: string }) => (
    <div data-testid="card-title-pill" data-active={active ? "true" : "false"}>
      {text}
    </div>
  ),
}));

describe("SavedCardTile", () => {
  it("keeps the card title pill controlled by whole-tile hover", () => {
    const { container } = render(
      <SavedCardTile
        title="The Trial"
        templateLabel="Quest Treasure"
        thumbnail={<div>Thumbnail</div>}
        variant="stockpile"
      />,
    );

    const pill = screen.getByTestId("card-title-pill");
    const tile = container.firstElementChild as HTMLElement;

    expect(pill).toHaveTextContent("The Trial");
    expect(pill).toHaveAttribute("data-active", "false");
    expect(screen.getByTitle("Quest Treasure")).toBeInTheDocument();

    fireEvent.mouseEnter(tile);
    expect(pill).toHaveAttribute("data-active", "true");

    fireEvent.mouseLeave(tile);
    expect(pill).toHaveAttribute("data-active", "false");
  });
});
