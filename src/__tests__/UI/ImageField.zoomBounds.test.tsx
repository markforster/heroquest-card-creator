import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import ImageField from "@/components/Cards/CardInspector/ImageField";
import { computeImageZoomModel } from "@/lib/image-scale";
import { IMAGE_CLIP_EDGE_BOTTOM } from "@/types/image-clip-edges";

import type { ComponentProps } from "react";

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/Assets", () => ({
  __esModule: true,
  AssetsModal: () => null,
}));

jest.mock("@/components/Cards/CardEditor/EditorTargetsContext", () => ({
  EDITOR_TARGET_IDS: { imageMain: "image-main" },
  useInspectorTargetRegistration: () => jest.fn(),
  useIsEditorTargetHovered: () => false,
  useSecondaryTargetActionRegistration: jest.fn(),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    listAssets: jest.fn(async () => []),
    getAssetObjectUrl: jest.fn(async () => null),
  },
}));

type FormValues = {
  imageAssetId?: string;
  imageAssetName?: string;
  imageScale?: number;
  imageScaleMode?: "absolute" | "relative";
  imageOriginalWidth?: number;
  imageOriginalHeight?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageRotation?: number;
  imageClipEdgeMask?: number;
  imageClipBottom?: number;
};

function renderWithForm(
  defaultValues: FormValues,
  options?: {
    clipEdgeSettings?: ComponentProps<typeof ImageField>["clipEdgeSettings"];
  },
) {
  function Harness() {
    const methods = useForm<FormValues>({ defaultValues });
    const currentScale = useWatch({ control: methods.control, name: "imageScale" }) as
      | number
      | undefined;
    const currentClipMask = useWatch({ control: methods.control, name: "imageClipEdgeMask" }) as
      | number
      | undefined;
    const currentClipBottom = useWatch({ control: methods.control, name: "imageClipBottom" }) as
      | number
      | undefined;
    return (
      <FormProvider {...methods}>
        <ImageField
          label="Artwork"
          boundsWidth={100}
          boundsHeight={100}
          clipEdgeSettings={options?.clipEdgeSettings}
        />
        <div data-testid="scale-value">{String(currentScale ?? "")}</div>
        <div data-testid="clip-mask-value">{String(currentClipMask ?? "")}</div>
        <div data-testid="clip-bottom-value">{String(currentClipBottom ?? "")}</div>
      </FormProvider>
    );
  }

  render(<Harness />);
}

describe("ImageField zoom bounds", () => {
  it("uses literal ui zoom semantics and renders dynamic cover marker", async () => {
    const rectSpy = jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const isScaleSlider =
          this instanceof HTMLInputElement &&
          this.type === "range" &&
          this.title === "tooltip.adjustScale";
        if (isScaleSlider) {
          return {
            x: 0,
            y: 0,
            width: 200,
            height: 12,
            top: 0,
            right: 200,
            bottom: 12,
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

    renderWithForm({
      imageAssetId: "asset-1",
      imageAssetName: "Art",
      imageScale: 1,
      imageScaleMode: "relative",
      imageOriginalWidth: 1050,
      imageOriginalHeight: 750,
      imageOffsetX: 0,
      imageOffsetY: 0,
      imageRotation: 0,
    });

    fireEvent.click(screen.getByTitle("form.imageAdjustments"));
    const slider = (await screen.findByTitle("tooltip.adjustScale")) as HTMLInputElement;
    expect(Number(slider.value)).toBeCloseTo(1, 6);
    expect(slider.step).toBe("0.01");
    expect(screen.getByTestId("image-scale-tick-1x")).toBeInTheDocument();
    expect(screen.getByTestId("image-scale-tick-3x")).toBeInTheDocument();
    expect(screen.getByTestId("image-scale-tick-cover")).toBeInTheDocument();
    expect(screen.getByTestId("image-scale-tick-max")).toBeInTheDocument();
    expect(screen.getByTestId("image-scale-tick-1x").style.left).toContain("px");

    const scaleValue = screen.getByTestId("scale-value");
    fireEvent.change(slider, { target: { value: "2" } });
    await waitFor(() => {
      expect(Number(scaleValue.textContent)).toBeCloseTo(2, 6);
    });

    fireEvent.change(slider, { target: { value: "3" } });
    await waitFor(() => {
      expect(Number(scaleValue.textContent)).toBeCloseTo(3, 6);
    });

    const model = computeImageZoomModel({ x: 0, y: 0, width: 100, height: 100 }, 1050, 750);
    expect(model.relativeCover).toBeGreaterThan(3);
    rectSpy.mockRestore();
  });

  it("does not show artwork lower clip toolbar controls without blueprint support", () => {
    renderWithForm({
      imageAssetId: "asset-1",
      imageAssetName: "Art",
      imageScale: 1,
      imageScaleMode: "relative",
      imageOffsetX: 0,
      imageOffsetY: 0,
      imageRotation: 0,
    });

    expect(screen.queryByTitle("form.artworkLowerClip")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle("form.imageAdjustments"));

    expect(screen.queryByText("form.artworkLowerClip")).not.toBeInTheDocument();
  });

  it("enables, updates, and disables artwork lower clip without changing transforms", async () => {
    renderWithForm(
      {
        imageAssetId: "asset-1",
        imageAssetName: "Art",
        imageScale: 1,
        imageScaleMode: "relative",
        imageOffsetX: 12,
        imageOffsetY: -8,
        imageRotation: 9,
      },
      {
        clipEdgeSettings: {
          adjustableClipEdgeMask: IMAGE_CLIP_EDGE_BOTTOM,
          bottomMin: 470,
          bottomMax: 1050,
          bottomDefault: 850,
          baseClipBounds: { x: 0, y: 0, width: 750, height: 1050 },
        },
      },
    );

    fireEvent.click(screen.getByTitle("form.imageAdjustments"));
    expect(await screen.findByTitle("tooltip.adjustScale")).toBeInTheDocument();
    expect(screen.queryByTitle("tooltip.toggleArtworkLowerClip")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle("form.artworkLowerClip"));

    const toggle = await screen.findByTitle("tooltip.toggleArtworkLowerClip");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByTestId("clip-mask-value")).toHaveTextContent("1");
      expect(screen.getByTestId("clip-bottom-value")).toHaveTextContent("850");
    });

    const slider = screen.getByTitle("tooltip.adjustArtworkLowerClip") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "760" } });

    await waitFor(() => {
      expect(screen.getByTestId("clip-mask-value")).toHaveTextContent("1");
      expect(screen.getByTestId("clip-bottom-value")).toHaveTextContent("760");
    });

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByTestId("clip-mask-value")).toHaveTextContent("");
      expect(screen.getByTestId("clip-bottom-value")).toHaveTextContent("760");
    });
  });
});
