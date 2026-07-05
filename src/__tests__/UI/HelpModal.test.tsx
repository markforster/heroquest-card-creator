import { render, screen } from "@testing-library/react";

import HelpModal from "@/components/Modals/HelpModal";
import { I18nProvider } from "@/i18n/I18nProvider";

function renderModal() {
  return render(
    <I18nProvider>
      <HelpModal isOpen onClose={() => undefined} />
    </I18nProvider>,
  );
}

describe("HelpModal", () => {
  it("renders PDF export guidance", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "PDF export" })).toBeInTheDocument();
    expect(
      screen.getByText(/Deck PDF export creates a print-ready PDF from a deck/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/choose exactly which sets to print/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Use the alignment test PDF before a larger print run/i),
    ).toBeInTheDocument();
  });
});
