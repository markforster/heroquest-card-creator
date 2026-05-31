import { fireEvent, render, screen } from "@testing-library/react";

import InspectorEntityRow from "@/components/Cards/CardInspector/InspectorEntityRow";

describe("InspectorEntityRow", () => {
  it("renders all slots with subtitle", () => {
    render(
      <InspectorEntityRow
        as="div"
        left={<span data-testid="left">L</span>}
        title="Title"
        subtitle="Subtitle"
        right={<span data-testid="right">R</span>}
      />,
    );

    expect(screen.getByTestId("left")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Subtitle")).toBeInTheDocument();
    expect(screen.getByTestId("right")).toBeInTheDocument();
  });

  it("uses button semantics and click handler when rendered as button", () => {
    const onClick = jest.fn();

    render(
      <InspectorEntityRow
        as="button"
        interactive
        left={<span>L</span>}
        title="Deck"
        right={<span>1</span>}
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Deck/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
