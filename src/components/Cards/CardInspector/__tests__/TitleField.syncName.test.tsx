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

jest.mock("@/components/Cards/CardEditor/EditorTargetsContext", () => ({
  EDITOR_TARGET_IDS: { title: "title" },
  useInspectorTargetRegistration: () => jest.fn(),
  useIsEditorTargetHovered: () => false,
  useSecondaryTargetActionRegistration: jest.fn(),
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
import type { TemplateId } from "@/types/templates";
import type { TitleTypography } from "@/types/title-typography";

function FormValueProbe() {
  const name = useWatch({ name: "name" }) as string | undefined;
  const titleTypography = useWatch({ name: "titleTypography" }) as TitleTypography | undefined;
  return (
    <>
      <div data-testid="name-value">{name ?? ""}</div>
      <div data-testid="title-typography-value">{String(titleTypography)}</div>
    </>
  );
}

function TestHarness({
  templateId = "hero",
  titleTypography,
}: {
  templateId?: TemplateId;
  titleTypography?: TitleTypography;
}) {
  const methods = useForm({
    defaultValues: {
      title: "Sir Ragnar",
      name: "Sir Ragnar",
      titleTypography,
    },
  });

  return (
    <FormProvider {...methods}>
      <TitleField label="form.heroName" showToolbar templateId={templateId} />
      <FormValueProbe />
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

  it("toggles the optional bold italic title state", () => {
    render(<TestHarness />);

    const toggle = screen.getByRole("button", { name: "tooltip.titleBoldItalic" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("title-typography-value")).toHaveTextContent("undefined");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("title-typography-value")).toHaveTextContent("boldItalic");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("title-typography-value")).toHaveTextContent("undefined");
  });

  it("reflects saved bold italic title state", () => {
    render(<TestHarness titleTypography="boldItalic" />);

    expect(screen.getByRole("button", { name: "tooltip.titleBoldItalic" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("reflects labelled-back bold italic default and stores an explicit bold override", () => {
    render(<TestHarness templateId="labelled-back" />);

    const toggle = screen.getByRole("button", { name: "tooltip.titleBoldItalic" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("title-typography-value")).toHaveTextContent("undefined");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("title-typography-value")).toHaveTextContent("bold");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("title-typography-value")).toHaveTextContent("undefined");
  });

  it("reflects saved labelled-back bold override", () => {
    render(<TestHarness templateId="labelled-back" titleTypography="bold" />);

    expect(screen.getByRole("button", { name: "tooltip.titleBoldItalic" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
