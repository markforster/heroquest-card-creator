import { render, screen } from "@testing-library/react";
import { Settings } from "lucide-react";

import NavActionButton from "@/components/Layout/LeftNav/NavActionButton";

describe("NavActionButton", () => {
  it("renders a labelled button with an icon", () => {
    render(
      <NavActionButton label="Library" icon={Settings} onClick={jest.fn()} ariaLabel="Library" />,
    );

    expect(screen.getByRole("button", { name: "Library" })).toBeInTheDocument();
  });
});
