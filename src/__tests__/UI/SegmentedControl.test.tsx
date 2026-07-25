import { fireEvent, render, screen } from "@testing-library/react";

import SegmentedControl from "@/components/common/SegmentedControl";

describe("SegmentedControl", () => {
  it("renders the active option and notifies on clicks", () => {
    const onChange = jest.fn();

    render(
      <SegmentedControl
        ariaLabel="Dice type"
        value="d6"
        onChange={onChange}
        options={[
          { value: "d6", label: "D6" },
          { value: "icon", label: "Icon dice" },
          { value: "detail", label: "Detail dice" },
        ]}
      />,
    );

    expect(screen.getByRole("tablist", { name: "Dice type" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "D6" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Icon dice" }));

    expect(onChange).toHaveBeenCalledWith("icon");
  });

  it("renders an optional prefix without changing the accessible label", () => {
    render(
      <SegmentedControl
        ariaLabel="Dice type"
        value="d6"
        onChange={jest.fn()}
        options={[
          {
            value: "d6",
            label: "D6",
            prefix: <span data-testid="d6-prefix">icon</span>,
          },
          { value: "icon", label: "Icon dice" },
        ]}
      />,
    );

    expect(screen.getByTestId("d6-prefix")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "D6" })).toBeInTheDocument();
  });
});
