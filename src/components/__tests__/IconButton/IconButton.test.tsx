import { fireEvent, render, screen } from "@testing-library/react";

import IconButton from "@/components/IconButton";

describe("IconButton", () => {
  function TestIcon(props: React.SVGProps<SVGSVGElement>) {
    return <svg data-testid="icon" {...props} />;
  }

  it("renders children and icon", () => {
    render(
      <IconButton className="btn btn-primary" icon={TestIcon}>
        Click me
      </IconButton>,
    );

    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("defaults type to button and applies props", () => {
    render(
      <IconButton className="btn" icon={TestIcon} title="Hello" disabled>
        Save
      </IconButton>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("title", "Hello");
    expect(button).toBeDisabled();
  });

  it("supports submit type", () => {
    render(
      <IconButton className="btn" icon={TestIcon} type="submit">
        Submit
      </IconButton>,
    );

    expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute("type", "submit");
  });

  it("calls onClick when clicked", () => {
    const onClick = jest.fn();
    render(
      <IconButton className="btn" icon={TestIcon} onClick={onClick}>
        Go
      </IconButton>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("marks the icon aria-hidden", () => {
    render(
      <IconButton className="btn" icon={TestIcon}>
        A11y
      </IconButton>,
    );

    expect(screen.getByTestId("icon")).toHaveAttribute("aria-hidden", "true");
  });
});
