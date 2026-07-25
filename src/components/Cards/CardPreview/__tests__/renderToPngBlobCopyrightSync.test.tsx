import { act, render } from "@testing-library/react";
import { createRef } from "react";

import CardPreview from "@/components/Cards/CardPreview";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview/types";

const capturedCopyrightColors: string[] = [];

jest.mock("@/components/BlueprintRenderer", () => ({
  __esModule: true,
  default: ({ copyrightTextColor }: { copyrightTextColor?: string }) => (
    <g data-testid="copyright-probe" data-color={copyrightTextColor ?? ""} />
  ),
}));

jest.mock("@/components/Providers/CopyrightSettingsContext", () => ({
  __esModule: true,
  useCopyrightSettings: () => ({
    defaultCopyright: "",
    isReady: true,
  }),
}));

jest.mock("@/components/Providers/LocalStorageProvider", () => ({
  __esModule: true,
  useLocalStorageBoolean: () => [false],
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/lib/render-svg-to-canvas", () => ({
  __esModule: true,
  renderSvgToCanvas: jest.fn(async ({ svgElement }: { svgElement: SVGSVGElement }) => {
    const renderedColor =
      svgElement.querySelector('[data-testid="copyright-probe"]')?.getAttribute("data-color") ??
      "";
    capturedCopyrightColors.push(renderedColor);
    const canvas = document.createElement("canvas");
    canvas.toBlob = ((callback: BlobCallback) => {
      callback(new Blob(["png"], { type: "image/png" }));
    }) as HTMLCanvasElement["toBlob"];
    return canvas;
  }),
}));

jest.mock("@/lib/png-metadata", () => ({
  __esModule: true,
  addPngTextChunk: async (blob: Blob) => blob,
}));

jest.mock("@/lib/watermark", () => ({
  __esModule: true,
  applyWatermarkToCanvas: jest.fn(),
  shouldApplyWatermark: () => false,
}));

jest.mock("@/components/Cards/CardPreview/cardPreviewDeveloperCredit", () => ({
  __esModule: true,
  drawDeveloperCredit: jest.fn(),
}));

describe("CardPreview renderToPngBlob", () => {
  const originalImage = global.Image;

  beforeEach(() => {
    capturedCopyrightColors.length = 0;

    class InstantImage {
      private listeners = new Map<string, EventListener[]>();

      addEventListener(type: string, listener: EventListener) {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
      }

      removeEventListener(type: string, listener: EventListener) {
        this.listeners.set(
          type,
          (this.listeners.get(type) ?? []).filter((entry) => entry !== listener),
        );
      }

      set src(_value: string) {
        queueMicrotask(() => {
          (this.listeners.get("load") ?? []).forEach((listener) => listener(new Event("load")));
        });
      }
    }

    global.Image = InstantImage as unknown as typeof Image;
  });

  afterEach(() => {
    global.Image = originalImage;
  });

  it("flushes the synced copyright color before exporting", async () => {
    const ref = createRef<CardPreviewHandle>();

    const { rerender } = render(
      <CardPreview
        ref={ref}
        templateId="hero"
        templateName="Hero"
        cardData={{ title: "Hero", showCopyright: true }}
        copyrightTextColor="#aa0000"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    rerender(
      <CardPreview
        ref={ref}
        templateId="hero"
        templateName="Hero"
        cardData={{ title: "Hero", showCopyright: true }}
        copyrightTextColor="#0000aa"
      />,
    );

    await act(async () => {
      await ref.current?.renderToPngBlob();
    });

    expect(capturedCopyrightColors).toEqual(["#0000aa"]);
  });
});
