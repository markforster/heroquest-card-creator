import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import ImageField from "@/components/Cards/CardInspector/ImageField";
import { computeImageZoomModel } from "@/lib/image-scale";

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
};

function renderWithForm(defaultValues: FormValues) {
  function Harness() {
    const methods = useForm<FormValues>({ defaultValues });
    const currentScale = useWatch({ control: methods.control, name: "imageScale" }) as
      | number
      | undefined;
    return (
      <FormProvider {...methods}>
        <ImageField label="Artwork" boundsWidth={100} boundsHeight={100} />
        <div data-testid="scale-value">{String(currentScale ?? "")}</div>
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
      imageOriginalWidth: 1056,
      imageOriginalHeight: 756,
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

    const model = computeImageZoomModel({ x: 0, y: 0, width: 100, height: 100 }, 1056, 756);
    expect(model.relativeCover).toBeGreaterThan(3);
    rectSpy.mockRestore();
  });
});
