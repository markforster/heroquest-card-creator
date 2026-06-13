import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

import SplitStatStepper from "@/components/Cards/CardInspector/SplitStatStepper";

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

type FormValues = {
  attack: [number, number, 0 | 1, "slash" | "paren" | "paren-leading"];
};

function renderWithForm(defaultValues: FormValues) {
  function Harness() {
    const methods = useForm<FormValues>({ defaultValues });
    return (
      <FormProvider {...methods}>
        <div style={{ overflow: "hidden", height: "48px" }}>
          <SplitStatStepper<FormValues> name="attack" label="Attack" />
        </div>
      </FormProvider>
    );
  }

  render(<Harness />);
}

describe("SplitStatStepper format popover", () => {
  it("renders the format menu in a portal so scroll containers do not clip it", async () => {
    const rectSpy = jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function mockRect(this: HTMLElement) {
        if (this.getAttribute("aria-label") === "tooltip.statFormat") {
          return {
            x: 80,
            y: 120,
            width: 32,
            height: 32,
            top: 120,
            right: 112,
            bottom: 152,
            left: 80,
            toJSON: () => ({}),
          } as DOMRect;
        }

        if (this.getAttribute("role") === "menu") {
          return {
            x: 0,
            y: 0,
            width: 72,
            height: 90,
            top: 0,
            right: 72,
            bottom: 90,
            left: 0,
            toJSON: () => ({}),
          } as DOMRect;
        }

        return {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          toJSON: () => ({}),
        } as DOMRect;
      });

    renderWithForm({ attack: [3, 4, 1, "slash"] });

    fireEvent.click(screen.getByRole("button", { name: "tooltip.statFormat" }));

    const menu = await screen.findByRole("menu");
    await waitFor(() => {
      expect(menu.style.left).toBe("60px");
      expect(menu.style.top).toBe("22px");
    });
    expect(menu.parentElement).toBe(document.body);

    rectSpy.mockRestore();
  });
});
