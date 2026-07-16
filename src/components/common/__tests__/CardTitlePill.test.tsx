import { render, screen } from "@testing-library/react";

import CardTitlePill from "@/components/common/CardTitlePill";

jest.mock("@/components/common/OverflowMarqueeText", () => ({
  __esModule: true,
  default: ({
    active,
    className,
    text,
  }: {
    active?: boolean;
    className?: string;
    text: string;
  }) => (
    <span className={className} data-active={active ? "true" : "false"}>
      {text}
    </span>
  ),
}));

describe("CardTitlePill", () => {
  it("renders its text, tooltip, custom class, and active marquee state", () => {
    render(<CardTitlePill text="Hero Card" active className="custom-pill" />);

    const pill = screen.getByTitle("Hero Card");
    expect(pill).toHaveClass("custom-pill");
    expect(screen.getByText("Hero Card")).toHaveAttribute("data-active", "true");
  });
});
