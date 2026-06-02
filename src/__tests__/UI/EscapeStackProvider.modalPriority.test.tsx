import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { EscapeStackProvider, useEscapeModalAware } from "@/components/common/EscapeStackProvider";
import ModalShell from "@/components/common/ModalShell";
import { I18nProvider } from "@/i18n/I18nProvider";

function EscapePriorityHarness({ onRouteEscape }: { onRouteEscape: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEscapeModalAware({
    id: "route:assets",
    isOpen: true,
    enabled: true,
    onEscape: onRouteEscape,
  });

  return (
    <>
      <button type="button" onClick={() => setIsModalOpen(true)}>
        Open preview
      </button>
      <ModalShell isOpen={isModalOpen} title="Preview modal" onClose={() => setIsModalOpen(false)}>
        Modal body
      </ModalShell>
    </>
  );
}

describe("EscapeStackProvider modal priority", () => {
  it("does not fall through to a lower-priority route handler when a modal handles Escape", () => {
    const onRouteEscape = jest.fn();

    render(
      <I18nProvider>
        <EscapeStackProvider>
          <EscapePriorityHarness onRouteEscape={onRouteEscape} />
        </EscapeStackProvider>
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open preview" }));
    expect(screen.getByRole("heading", { name: "Preview modal" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("heading", { name: "Preview modal" })).not.toBeInTheDocument();
    expect(onRouteEscape).not.toHaveBeenCalled();
  });
});
