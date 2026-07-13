import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import {
  EDITOR_TARGET_IDS,
  EditorTargetsProvider,
  useEditorTargets,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import HeroBackLogoField from "@/components/Cards/CardInspector/HeroBackLogoField";

import type { ReactNode } from "react";

type MockOption = {
  value: string;
  label: string;
};

const addHeroBackLogo = jest.fn();
const getImageDimensions = jest.fn();
const listHeroBackLogos = jest.fn();
const refreshCardThumbnails = jest.fn();

jest.mock("react-select", () => {
  return function MockReactSelect(props: {
    options: MockOption[];
    value: MockOption | null;
    onChange: (option: MockOption | null) => void;
    formatOptionLabel?: (option: MockOption, meta: { context: "menu" | "value" }) => ReactNode;
    isDisabled?: boolean;
    inputId?: string;
  }) {
    return (
      <div>
        <div data-testid="mock-react-select-selected">
          {props.value && props.formatOptionLabel
            ? props.formatOptionLabel(props.value, { context: "value" })
            : props.value?.label ?? ""}
        </div>
        <select
          data-testid="mock-react-select"
          id={props.inputId}
          value={props.value?.value ?? ""}
          disabled={props.isDisabled}
          onChange={(event) => {
            const next = props.options.find((option) => option.value === event.target.value) ?? null;
            props.onChange(next);
          }}
        >
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div data-testid="mock-react-select-options">
          {props.options.map((option) => (
            <div key={option.value}>
              {props.formatOptionLabel ? props.formatOptionLabel(option, { context: "menu" }) : option.label}
            </div>
          ))}
        </div>
      </div>
    );
  };
});

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "status.default": "Default",
          "actions.addAnother": "Add another...",
          "actions.manageLogos": "Manage logos",
          "helper.heroBackLogo": "Choose the baked default logo or a saved custom logo for this Hero Back card.",
          "status.noLogoSelected": "No logo selected",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

jest.mock("@/components/Assets/getImageDimensions", () => ({
  __esModule: true,
  default: (...args: unknown[]) => getImageDimensions(...args),
}));

jest.mock("@/lib", () => ({
  generateId: () => "generated-logo-id",
}));

jest.mock("@/hooks/useHeroBackLogoImageUrl", () => ({
  useHeroBackLogoImageUrl: (logoId?: string) =>
    logoId
      ? { url: `blob:${logoId}`, status: "ready", width: 320, height: 90 }
      : { url: null, status: "idle", width: null, height: null },
}));

jest.mock("@/lib/hero-back-logos-db", () => ({
  addHeroBackLogo: (...args: unknown[]) => addHeroBackLogo(...args),
  listHeroBackLogos: (...args: unknown[]) => listHeroBackLogos(...args),
}));

jest.mock("@/components/Providers/EditorSaveContext", () => ({
  useEditorSave: () => ({
    refreshCardThumbnails: (...args: unknown[]) => refreshCardThumbnails(...args),
  }),
}));

jest.mock("@/components/Cards/CardInspector/HeroBackLogoModal", () => ({
  __esModule: true,
  default: ({
    isOpen,
    onDeleted,
  }: {
    isOpen: boolean;
    onDeleted?: (
      deletedLogoId: string,
      remediation: { mode: "default" | "custom"; logoId?: string; logoName?: string; width?: number; height?: number },
      replacement?: { id: string; name: string; width: number; height: number } | null,
      affectedCardIds?: string[],
    ) => void | Promise<void>;
  }) =>
    isOpen ? (
      <div>
        MODAL_OPEN
        <button
          type="button"
          onClick={() => void onDeleted?.("logo-1", { mode: "default" }, null, ["card-1", "card-2"])}
        >
          Trigger delete
        </button>
      </div>
    ) : null,
}));

function StateProbe() {
  const mode = useWatch({ name: "heroBackLogoMode" });
  const logoId = useWatch({ name: "heroBackLogoId" });
  const logoName = useWatch({ name: "heroBackLogoName" });

  return (
    <div data-testid="hero-back-logo-state">
      {JSON.stringify({ mode, logoId, logoName })}
    </div>
  );
}

function FocusRequestButton() {
  const { requestFocusTarget } = useEditorTargets();

  return (
    <button type="button" onClick={() => requestFocusTarget(EDITOR_TARGET_IDS.heroBackLogo)}>
      focus-hero-back-logo
    </button>
  );
}

function TestHarness({
  defaultValues,
}: {
  defaultValues?: {
    heroBackLogoMode?: "default" | "custom";
    heroBackLogoId?: string;
    heroBackLogoName?: string;
  };
}) {
  const methods = useForm({
    defaultValues: {
      heroBackLogoMode: "default",
      heroBackLogoId: undefined,
      heroBackLogoName: undefined,
      ...defaultValues,
    },
  });

  return (
    <EditorTargetsProvider>
      <FormProvider {...methods}>
        <HeroBackLogoField label="Hero Back logo" />
        <StateProbe />
        <FocusRequestButton />
      </FormProvider>
    </EditorTargetsProvider>
  );
}

describe("HeroBackLogoField", () => {
  beforeEach(() => {
    addHeroBackLogo.mockReset();
    getImageDimensions.mockReset();
    listHeroBackLogos.mockReset();
    refreshCardThumbnails.mockReset();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: jest.fn(),
    });
  });

  it("renders image-only previews for default and saved logos in the select", async () => {
    listHeroBackLogos.mockResolvedValue([
      { id: "logo-1", name: "Clan Raven", width: 320, height: 90 },
    ]);

    render(<TestHarness />);

    const select = await screen.findByTestId("mock-react-select");
    expect(Array.from(select.querySelectorAll("option")).map((option) => option.value)).toEqual([
      "__default__",
      "logo-1",
    ]);
    expect(screen.getByTestId("hero-back-logo-select-value")).toHaveAttribute(
      "data-preview-variant",
      "default",
    );
    expect(screen.getByTestId("mock-react-select-options").querySelectorAll("img")).toHaveLength(2);
    expect(screen.getByTestId("mock-react-select-options")).not.toHaveTextContent("Default");
    expect(screen.getByTestId("mock-react-select-options")).not.toHaveTextContent("Clan Raven");
    expect(screen.getByRole("button", { name: "Add another..." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage logos" })).toBeInTheDocument();
  });

  it("assigns a saved logo when the user selects it", async () => {
    listHeroBackLogos.mockResolvedValue([
      { id: "logo-1", name: "Clan Raven", width: 320, height: 90 },
    ]);

    render(<TestHarness />);

    fireEvent.change(await screen.findByTestId("mock-react-select"), { target: { value: "logo-1" } });

    await waitFor(() => {
      expect(screen.getByTestId("hero-back-logo-state")).toHaveTextContent(
        JSON.stringify({ mode: "custom", logoId: "logo-1", logoName: "Clan Raven" }),
      );
    });
    expect(screen.getByTestId("hero-back-logo-select-value")).toHaveAttribute(
      "data-preview-variant",
      "custom",
    );
    expect(screen.getByTestId("hero-back-logo-select-value").querySelector("img")).not.toBeNull();
    expect(screen.getByTestId("hero-back-logo-select-value")).not.toHaveTextContent("Clan Raven");
  });

  it("uploads and assigns a new logo when the add action is used", async () => {
    listHeroBackLogos
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "generated-logo-id", name: "uploaded-logo.png", width: 280, height: 88 },
      ]);
    getImageDimensions.mockResolvedValue({ width: 280, height: 88 });
    addHeroBackLogo.mockResolvedValue(undefined);

    const { container } = render(<TestHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Add another..." }));

    const hiddenInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["logo"], "uploaded-logo.png", { type: "image/png" });
    fireEvent.change(hiddenInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(addHeroBackLogo).toHaveBeenCalledWith(
        "generated-logo-id",
        file,
        expect.objectContaining({
          name: "uploaded-logo.png",
          mimeType: "image/png",
          width: 280,
          height: 88,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("hero-back-logo-state")).toHaveTextContent(
        JSON.stringify({
          mode: "custom",
          logoId: "generated-logo-id",
          logoName: "uploaded-logo.png",
        }),
      );
    });
  });

  it("refreshes affected saved thumbnails after logo deletion remediation", async () => {
    listHeroBackLogos.mockResolvedValue([
      { id: "logo-1", name: "Clan Raven", width: 320, height: 90 },
    ]);

    render(
      <TestHarness
        defaultValues={{
          heroBackLogoMode: "custom",
          heroBackLogoId: "logo-1",
          heroBackLogoName: "Clan Raven",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Manage logos" }));
    fireEvent.click(await screen.findByRole("button", { name: "Trigger delete" }));

    await waitFor(() => {
      expect(refreshCardThumbnails).toHaveBeenCalledWith(["card-1", "card-2"]);
    });
    expect(screen.getByTestId("hero-back-logo-state")).toHaveTextContent(
      JSON.stringify({ mode: "default", logoId: undefined, logoName: undefined }),
    );
  });

  it("registers the Hero Back logo field as an inspector target and focuses the select", async () => {
    listHeroBackLogos.mockResolvedValue([
      { id: "logo-1", name: "Clan Raven", width: 320, height: 90 },
    ]);

    const { container } = render(<TestHarness />);

    const wrapper = container.querySelector(`[data-hqcc-edit="${EDITOR_TARGET_IDS.heroBackLogo}"]`);
    expect(wrapper).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "focus-hero-back-logo" }));

    await waitFor(() => {
      expect(screen.getByTestId("mock-react-select")).toHaveFocus();
    });

    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
