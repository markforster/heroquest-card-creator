import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import InlineDicePicker from "@/components/Cards/CardInspector/InlineDicePicker";
import { I18nProvider } from "@/i18n/I18nProvider";

jest.mock("@/components/Cards/CardInspector/card-inspector-popover-position", () => ({
  __esModule: true,
  computeCardInspectorPopoverPosition: () => ({ left: 120, top: 160, width: 360 }),
}));

jest.mock("@/components/common/ColorPickerField", () => ({
  __esModule: true,
  default: function MockColorPickerField({
    label,
    selectedValue,
    onChange,
    onPopoverElementChange,
  }: {
    label: string;
    selectedValue: string;
    onChange: (value: string) => void;
    onPopoverElementChange?: (element: HTMLDivElement | null) => void;
  }) {
    const React = require("react") as typeof import("react");
    const [isPortalOpen, setIsPortalOpen] = React.useState(false);

    React.useEffect(() => {
      if (!isPortalOpen) {
        onPopoverElementChange?.(null);
        return;
      }

      const portal = document.createElement("div");
      portal.setAttribute("data-testid", `${label}-portal`);
      const portalButton = document.createElement("button");
      portalButton.type = "button";
      portalButton.setAttribute("aria-label", `${label} portal action`);
      portalButton.textContent = `${label} portal action`;
      portalButton.addEventListener("click", () => {
        const nextValue =
          label === "Background color"
            ? selectedValue === "#FFFFFF"
              ? "#B21D1D"
              : "#1C4AA8"
            : selectedValue === "#FFFFFF"
              ? "#D6A600"
              : "#111111";
        onChange(nextValue);
      });
      portal.appendChild(portalButton);
      document.body.appendChild(portal);
      onPopoverElementChange?.(portal);

      return () => {
        onPopoverElementChange?.(null);
        portal.remove();
      };
    }, [isPortalOpen, label, onChange, onPopoverElementChange, selectedValue]);

    return (
      <button type="button" aria-label={label} onClick={() => setIsPortalOpen(true)}>
        {label}
      </button>
    );
  },
}));

describe("InlineDicePicker", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  function renderPicker(onInsert = jest.fn()) {
    render(
      <I18nProvider>
        <InlineDicePicker onInsert={onInsert} />
      </I18nProvider>,
    );

    return { onInsert };
  }

  function expectDieColors(
    button: HTMLElement,
    { fill, stroke }: { fill: string; stroke: string },
  ) {
    const rect = button.querySelector("rect");
    expect(rect).not.toBeNull();
    expect(rect).toHaveAttribute("fill", fill);
    expect(rect).toHaveAttribute("stroke", stroke);
  }

  it("switches friendly face controls when the dice type changes", async () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Insert inline dice" }));

    expect(await screen.findByText("Face")).toBeInTheDocument();
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getAllByText("Preview")[0]).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "D6" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { hidden: true }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Value 6" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Icon dice" }));

    expect(screen.getByRole("button", { name: /Skull/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hero Shield/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Value 6" })).not.toBeInTheDocument();
  });

  it("updates the token when colours change and inserts at the current selection", async () => {
    const { onInsert } = renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Insert inline dice" }));
    await screen.findByRole("dialog", { name: "Inline dice" });

    expect(screen.getByLabelText("Token")).toHaveValue("&d6-1-r;");

    fireEvent.click(screen.getByLabelText("Background color"));
    fireEvent.click(await screen.findByRole("button", { name: "Background color portal action" }));
    fireEvent.click(screen.getByLabelText("Symbol / pips color"));
    fireEvent.click(await screen.findByRole("button", { name: "Symbol / pips color portal action" }));

    expect(screen.getByLabelText("Token")).toHaveValue("&d6-1-bl-y;");

    fireEvent.click(screen.getByRole("button", { name: "Insert" }));

    expect(onInsert).toHaveBeenCalledWith("&d6-1-bl-y;");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Inline dice" })).not.toBeInTheDocument();
    });
  });

  it("copies the token, keeps the picker open, and restores recents back into the configurator", async () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Insert inline dice" }));
    await screen.findByRole("dialog", { name: "Inline dice" });

    fireEvent.click(screen.getByRole("button", { name: "Detail dice" }));
    fireEvent.click(screen.getByRole("button", { name: "MD" }));
    fireEvent.click(screen.getByLabelText("Background color"));
    fireEvent.click(await screen.findByRole("button", { name: "Background color portal action" }));

    const tokenField = screen.getByLabelText("Token");
    expect(tokenField).toHaveValue("&cd-md-bl-bk;");

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => {
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith("&cd-md-bl-bk;");
    });
    expect(screen.getByRole("dialog", { name: "Inline dice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "&cd-md-bl-bk;" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "D6" }));
    expect(tokenField).toHaveValue("&d6-1-r;");

    fireEvent.click(screen.getByRole("button", { name: "&cd-md-bl-bk;" }));
    expect(tokenField).toHaveValue("&cd-md-bl-bk;");
  });

  it("renders defaults above recents and clicking a default repopulates the configurator", async () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Insert inline dice" }));
    await screen.findByRole("dialog", { name: "Inline dice" });

    const defaultsLabel = screen.getByText("Defaults");
    const recentLabel = screen.getByText("Recent");
    expect(
      defaultsLabel.compareDocumentPosition(recentLabel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const d6Default = screen.getAllByRole("button", { name: "&d6-6-r;" })[0];
    fireEvent.click(d6Default);
    expect(screen.getByLabelText("Token")).toHaveValue("&d6-6-r;");
    expect(d6Default).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Icon dice" }));
    expect(screen.getByLabelText("Token")).toHaveValue("&cd-s-w;");
    expect(screen.getByRole("button", { name: "&cd-m-w;" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "&cd-h-w;" }));
    expect(screen.getByLabelText("Token")).toHaveValue("&cd-h-w;");
  });

  it("resets to the default d6 config each time the picker opens", async () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Insert inline dice" }));
    await screen.findByRole("dialog", { name: "Inline dice" });

    fireEvent.click(screen.getByLabelText("Background color"));
    fireEvent.click(await screen.findByRole("button", { name: "Background color portal action" }));
    expect(screen.getByLabelText("Token")).toHaveValue("&d6-1-bl;");

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Inline dice" })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Insert inline dice" }));
    await screen.findByRole("dialog", { name: "Inline dice" });
    expect(screen.getByLabelText("Token")).toHaveValue("&d6-1-r;");
  });

  it("resets each dice type to its intended defaults", async () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Insert inline dice" }));
    await screen.findByRole("dialog", { name: "Inline dice" });

    fireEvent.click(screen.getByRole("button", { name: "Icon dice" }));
    expect(screen.getByLabelText("Token")).toHaveValue("&cd-s-w;");

    fireEvent.click(screen.getByRole("button", { name: "Detail dice" }));
    expect(screen.getByLabelText("Token")).toHaveValue("&cd-cd-y-bk;");

    fireEvent.click(screen.getByRole("button", { name: "D6" }));
    expect(screen.getByLabelText("Token")).toHaveValue("&d6-1-r;");
  });

  it("keeps face-chip preview colours fixed while the live config changes", async () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Insert inline dice" }));
    await screen.findByRole("dialog", { name: "Inline dice" });

    const valueOneButton = screen.getByRole("button", { name: "Value 1" });
    expectDieColors(valueOneButton, { fill: "#B21D1D", stroke: "#FFFFFF" });

    fireEvent.click(screen.getByLabelText("Background color"));
    fireEvent.click(await screen.findByRole("button", { name: "Background color portal action" }));
    fireEvent.click(screen.getByLabelText("Symbol / pips color"));
    fireEvent.click(await screen.findByRole("button", { name: "Symbol / pips color portal action" }));

    expect(screen.getByLabelText("Token")).toHaveValue("&d6-1-bl-y;");
    expectDieColors(valueOneButton, { fill: "#B21D1D", stroke: "#FFFFFF" });
  });

  it("uses fixed canonical colours for detail face chips while recents restore saved custom colours", async () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Insert inline dice" }));
    await screen.findByRole("dialog", { name: "Inline dice" });

    fireEvent.click(screen.getByRole("button", { name: "Detail dice" }));

    expectDieColors(screen.getByRole("button", { name: "CD" }), {
      fill: "#FFFFFF",
      stroke: "#111111",
    });
    expectDieColors(screen.getByRole("button", { name: "AD" }), {
      fill: "#B21D1D",
      stroke: "#FFFFFF",
    });
    expectDieColors(screen.getByRole("button", { name: "DD" }), {
      fill: "#111111",
      stroke: "#FFFFFF",
    });
    expectDieColors(screen.getByRole("button", { name: "MD" }), {
      fill: "#1F7A3B",
      stroke: "#FFFFFF",
    });

    fireEvent.click(screen.getByRole("button", { name: "MD" }));
    fireEvent.click(screen.getByLabelText("Background color"));
    fireEvent.click(await screen.findByRole("button", { name: "Background color portal action" }));
    expect(screen.getByLabelText("Token")).toHaveValue("&cd-md-bl-bk;");

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => {
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith("&cd-md-bl-bk;");
    });

    fireEvent.click(screen.getByRole("button", { name: "D6" }));
    expect(screen.getByLabelText("Token")).toHaveValue("&d6-1-r;");

    fireEvent.click(screen.getByRole("button", { name: "&cd-md-bl-bk;" }));
    expect(screen.getByLabelText("Token")).toHaveValue("&cd-md-bl-bk;");
  });

  it("shows type-specific default presets for detail dice", async () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Insert inline dice" }));
    await screen.findByRole("dialog", { name: "Inline dice" });

    fireEvent.click(screen.getByRole("button", { name: "Detail dice" }));

    expect(screen.getByRole("button", { name: "&cd-cd-w;" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "&cd-ad-r;" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "&cd-dd-bk;" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "&cd-md-g;" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "&cd-dd-bk;" }));
    expect(screen.getByLabelText("Token")).toHaveValue("&cd-dd-bk;");
  });

  it("keeps the dice configurator open when clicking inside a portaled color picker", async () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Insert inline dice" }));
    await screen.findByRole("dialog", { name: "Inline dice" });

    fireEvent.click(screen.getByLabelText("Background color"));
    const portalAction = await screen.findByRole("button", {
      name: "Background color portal action",
    });

    fireEvent.mouseDown(portalAction);
    expect(screen.getByRole("dialog", { name: "Inline dice" })).toBeInTheDocument();

    fireEvent.click(portalAction);
    expect(screen.getByLabelText("Token")).toHaveValue("&d6-1-bl;");
    expect(screen.getByRole("dialog", { name: "Inline dice" })).toBeInTheDocument();
  });

  it("still closes the dice configurator on true outside clicks", async () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Insert inline dice" }));
    await screen.findByRole("dialog", { name: "Inline dice" });

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Inline dice" })).not.toBeInTheDocument();
    });
  });
});
