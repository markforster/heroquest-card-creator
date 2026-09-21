import { render, screen } from "@testing-library/react";

import FormattingHelpContent from "@/components/Cards/CardInspector/FormattingHelpContent";
import { I18nProvider } from "@/i18n/I18nProvider";

jest.mock("@/lib/text-fitting/measure", () => ({
  createTextMeasurer: (size: number) => (text: string) => (text.length * size) / 2,
}));

function renderContent() {
  return render(
    <I18nProvider>
      <FormattingHelpContent />
    </I18nProvider>,
  );
}

describe("FormattingHelpContent", () => {
  it("shows whitespace-preserving list input and the real SVG result", () => {
    const { container } = renderContent();
    expect(screen.getByRole("heading", { name: "Lists" })).toBeInTheDocument();
    expect(container.querySelector("pre code")?.textContent).toContain("\n  - Open a door");
    expect(
      [...container.querySelectorAll("[data-list-marker]")].map((node) => node.textContent),
    ).toEqual(["•", "•", "•", "3.", "4."]);
  });
  it("documents both the canonical scale tag and the shipped sc alias", () => {
    renderContent();

    expect(screen.getByText("<scale=1.25>large text</scale>")).toBeInTheDocument();
    expect(screen.getByText("<sc=0.75>small text</sc>")).toBeInTheDocument();
    expect(screen.getByText("large text")).toBeInTheDocument();
    expect(screen.getByText("small text")).toBeInTheDocument();
  });
});
