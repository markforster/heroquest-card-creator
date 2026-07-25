import { render, screen } from "@testing-library/react";

import FormattingHelpContent from "@/components/Cards/CardInspector/FormattingHelpContent";
import { I18nProvider } from "@/i18n/I18nProvider";

function renderContent() {
  return render(
    <I18nProvider>
      <FormattingHelpContent />
    </I18nProvider>,
  );
}

describe("FormattingHelpContent", () => {
  it("documents both the canonical scale tag and the shipped sc alias", () => {
    renderContent();

    expect(screen.getByText("<scale=1.25>large text</scale>")).toBeInTheDocument();
    expect(screen.getByText("<sc=0.75>small text</sc>")).toBeInTheDocument();
    expect(screen.getByText("large text")).toBeInTheDocument();
    expect(screen.getByText("small text")).toBeInTheDocument();
  });
});
