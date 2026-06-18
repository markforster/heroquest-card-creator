import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/Providers/PreviewCanvasContext", () => ({
  usePreviewCanvas: () => ({
    renderPreviewCanvas: jest.fn(),
  }),
}));

jest.mock("@/hooks/useSmartSwatches", () => ({
  useSmartSwatches: () => ({
    smartGroups: [],
    isSmartBusy: false,
    requestSmart: jest.fn(),
  }),
}));

jest.mock("@/components/common/ColorPickerField", () => ({
  __esModule: true,
  default: () => <div>COLOR_PICKER</div>,
}));

import TitleField from "@/components/Cards/CardInspector/TitleField";

function NameValueProbe() {
  const name = useWatch({ name: "name" }) as string | undefined;
  return <div data-testid="name-value">{name ?? ""}</div>;
}

function TestHarness() {
  const methods = useForm({
    defaultValues: {
      title: "Sir Ragnar",
      name: "Sir Ragnar",
    },
  });

  return (
    <FormProvider {...methods}>
      <TitleField label="form.heroName" />
      <NameValueProbe />
    </FormProvider>
  );
}

describe("TitleField", () => {
  it("mirrors title edits into the canonical name field", () => {
    render(<TestHarness />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Mentor" } });

    expect(screen.getByRole("textbox")).toHaveValue("Mentor");
    expect(screen.getByTestId("name-value")).toHaveTextContent("Mentor");
  });
});
