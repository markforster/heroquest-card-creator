import { fireEvent, render, screen } from "@testing-library/react";

import { DangerNotice, InfoNotice, SuccessNotice, WarningNotice } from "@/components/common/Notice";
import ProgressBar from "@/components/common/ProgressBar";
import LoadingMessage from "@/components/Modals/RecentCardsModal/LoadingMessage";
import ToolbarButton from "@/components/ToolsToolbar/ToolbarButton";
import ToolbarButtonGroup from "@/components/ToolsToolbar/ToolbarButtonGroup";

describe("shared presentational components", () => {
  it("renders all notice variants with their requested roles", () => {
    render(
      <>
        <InfoNotice>Info</InfoNotice>
        <SuccessNotice>Success</SuccessNotice>
        <WarningNotice role="alert">Warning</WarningNotice>
        <DangerNotice>Danger</DangerNotice>
      </>,
    );

    expect(screen.getByText("Info")).toHaveClass("alert-info");
    expect(screen.getByText("Success")).toHaveClass("alert-success");
    expect(screen.getByRole("alert")).toHaveTextContent("Warning");
    expect(screen.getByText("Danger")).toHaveClass("alert-danger");
  });

  it("clamps progress and renders an optional label", () => {
    const { container } = render(
      <ProgressBar percent={140} fillClassName="fill" label="Complete" />,
    );

    expect(container.querySelector(".fill")).toHaveStyle({ width: "100%" });
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("renders loading and toolbar primitives with accessible behavior", () => {
    const onClick = jest.fn();
    render(
      <>
        <LoadingMessage>Loading cards</LoadingMessage>
        <ToolbarButtonGroup>
          <ToolbarButton ariaLabel="Toggle" title="Toggle tool" onClick={onClick} isActive>
            Tool
          </ToolbarButton>
        </ToolbarButtonGroup>
      </>,
    );

    expect(screen.getByText("Loading cards")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Toggle" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByRole("group")).toContainElement(button);
  });
});
