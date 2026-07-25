import { fireEvent, render, screen } from "@testing-library/react";

import TemplateCard from "@/components/TemplatesList/TemplateCard";

jest.mock("next/image", () => ({
  __esModule: true,
  default: function NextImage(
    props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean },
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fill, ...imageProps } = props;
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...imageProps} />;
  },
}));

jest.mock("@/components/common/CardTitlePill", () => ({
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
    <span className={className} data-testid="card-title-pill" data-active={active ? "true" : "false"}>
      {text}
    </span>
  ),
}));

describe("TemplateCard", () => {
  it("keeps the grid title pill hidden while retaining an accessible template label", () => {
    const onSelect = jest.fn();
    render(
      <TemplateCard
        id="hero"
        isSelected={false}
        label="Hero Card"
        thumbnail="/hero.png"
        variant="grid"
        onSelect={onSelect}
      />,
    );

    const button = screen.getByRole("button", { name: "Hero Card" });
    const image = button.querySelector("img");

    expect(image).toHaveAttribute("alt", "Hero Card");
    expect(screen.queryByTestId("card-title-pill")).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith("hero");
  });

  it("keeps sidebar cards thumbnail-only with an accessible image label", () => {
    render(
      <TemplateCard
        id="hero"
        isSelected
        label="Hero Card"
        thumbnail="/hero.png"
        variant="sidebar"
        onSelect={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("card-title-pill")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Hero Card" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hero Card" })).toBeInTheDocument();
  });
});
