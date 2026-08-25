import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import BackgroundTintField from "@/components/Cards/CardInspector/BackgroundTintField";

jest.mock("react-colorful", () => ({
  RgbaColorPicker: () => <div>COLOR_PICKER</div>,
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => (key === "form.backgroundTintBlendMode" ? "Blend mode" : key),
  }),
}));

jest.mock("@/hooks/useSharedColorSwatches", () => ({
  useSharedColorSwatches: () => ({
    swatches: [],
    saveSwatch: jest.fn(async () => {}),
    removeSwatch: jest.fn(async () => {}),
    maxSwatches: 10,
  }),
}));

jest.mock("@/components/Providers/EditorFormContext", () => ({
  useEditorForm: () => ({ savedValues: null }),
}));

jest.mock("@/components/Providers/PreviewCanvasContext", () => ({
  usePreviewCanvas: () => ({ renderPreviewCanvas: jest.fn(async () => null) }),
}));

function TestHarness({
  initialBlendMode,
}: {
  initialBlendMode?: "multiply" | "screen" | "overlay";
}) {
  const methods = useForm({
    defaultValues: {
      backgroundTint: "#FFFFFF",
      backgroundTintBlendMode: initialBlendMode,
    },
  });
  const blendMode = useWatch({
    control: methods.control,
    name: "backgroundTintBlendMode",
  });

  return (
    <FormProvider {...methods}>
      <BackgroundTintField label="Background tint" templateId="hero" />
      <output aria-label="stored blend mode">{blendMode ?? ""}</output>
    </FormProvider>
  );
}

describe("BackgroundTintField", () => {
  it("shows a tint blend-mode control in the tint popover", () => {
    render(<TestHarness initialBlendMode="screen" />);

    fireEvent.click(screen.getByRole("button", { name: "actions.select #FFFFFF" }));

    expect(screen.getByRole("combobox", { name: "Blend mode" })).toHaveValue("screen");
  });

  it("stores non-default blend modes and clears multiply back to the implicit default", () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByRole("button", { name: "actions.select #FFFFFF" }));

    const select = screen.getByRole("combobox", { name: "Blend mode" });
    expect(select).toHaveValue("multiply");

    fireEvent.change(select, { target: { value: "screen" } });
    expect(screen.getByLabelText("stored blend mode")).toHaveTextContent("screen");

    fireEvent.change(select, { target: { value: "multiply" } });
    expect(screen.getByLabelText("stored blend mode")).toHaveTextContent("");
  });
});
