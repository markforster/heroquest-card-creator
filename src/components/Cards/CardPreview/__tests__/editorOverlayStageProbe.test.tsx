import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import CardPreview from "@/components/Cards/CardPreview";
import {
  EDITOR_TARGET_IDS,
  EditorTargetsProvider,
  useEditorTargets,
} from "@/components/Cards/CardEditor/EditorTargetsContext";

jest.mock("@/components/BlueprintRenderer", () => ({
  __esModule: true,
  default: () => <g data-testid="blueprint-renderer" />,
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

describe("CardPreview editor overlay stage probe", () => {
  const originalImage = global.Image;

  function SelectImageMainTarget() {
    const { setSelectedTargetId } = useEditorTargets();

    useEffect(() => {
      setSelectedTargetId(EDITOR_TARGET_IDS.imageMain);
    }, [setSelectedTargetId]);

    return null;
  }

  function PreviewFormHarness({
    children,
    defaultValues,
  }: {
    children: React.ReactNode;
    defaultValues: Record<string, unknown>;
  }) {
    const form = useForm({ defaultValues });
    return <FormProvider {...form}>{children}</FormProvider>;
  }

  beforeEach(() => {
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

  it("does not render an image frame when no target is selected", async () => {
    const { container } = render(<CardPreview templateId="hero" templateName="Hero" cardData={{ title: "Hero" }} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('[data-editor-image-frame="true"]')).toBeNull();
  });

  it("renders a preview-only image frame when image.main is selected", async () => {
    const { container } = render(
      <EditorTargetsProvider>
        <SelectImageMainTarget />
        <PreviewFormHarness
          defaultValues={{
            title: "Hero",
            imageAssetId: "asset-1",
            imageOriginalWidth: 1400,
            imageOriginalHeight: 1800,
          }}
        >
          <CardPreview
            templateId="hero"
            templateName="Hero"
            cardData={{
              title: "Hero",
              imageAssetId: "asset-1",
              imageOriginalWidth: 1400,
              imageOriginalHeight: 1800,
            }}
          />
        </PreviewFormHarness>
      </EditorTargetsProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('[data-editor-image-frame="true"]')).not.toBeNull();
    expect(container.querySelector('[data-preview-only="editor-overlay"]')).not.toBeNull();
    expect(container.querySelector('[data-editor-image-move-handle="true"]')).not.toBeNull();
    expect(container.querySelector('[data-editor-image-transform-handle="true"]')).not.toBeNull();
  });

  it("extends the transform arm as image scale increases", async () => {
    const { container: smallContainer } = render(
      <EditorTargetsProvider>
        <SelectImageMainTarget />
        <PreviewFormHarness
          defaultValues={{
            title: "Hero",
            imageAssetId: "asset-1",
            imageOriginalWidth: 1400,
            imageOriginalHeight: 1800,
            imageScale: 0.6,
            imageScaleMode: "relative",
          }}
        >
          <CardPreview
            templateId="hero"
            templateName="Hero"
            cardData={{
              title: "Hero",
              imageAssetId: "asset-1",
              imageOriginalWidth: 1400,
              imageOriginalHeight: 1800,
              imageScale: 0.6,
              imageScaleMode: "relative",
            }}
          />
        </PreviewFormHarness>
      </EditorTargetsProvider>,
    );

    const { container: largeContainer } = render(
      <EditorTargetsProvider>
        <SelectImageMainTarget />
        <PreviewFormHarness
          defaultValues={{
            title: "Hero",
            imageAssetId: "asset-1",
            imageOriginalWidth: 1400,
            imageOriginalHeight: 1800,
            imageScale: 2.4,
            imageScaleMode: "relative",
          }}
        >
          <CardPreview
            templateId="hero"
            templateName="Hero"
            cardData={{
              title: "Hero",
              imageAssetId: "asset-1",
              imageOriginalWidth: 1400,
              imageOriginalHeight: 1800,
              imageScale: 2.4,
              imageScaleMode: "relative",
            }}
          />
        </PreviewFormHarness>
      </EditorTargetsProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const smallHandle = smallContainer.querySelector(
      '[data-editor-image-transform-handle="true"]',
    ) as SVGCircleElement;
    const largeHandle = largeContainer.querySelector(
      '[data-editor-image-transform-handle="true"]',
    ) as SVGCircleElement;
    const smallCenter = smallContainer.querySelector(
      '[data-editor-image-move-handle="true"]',
    ) as SVGCircleElement;
    const largeCenter = largeContainer.querySelector(
      '[data-editor-image-move-handle="true"]',
    ) as SVGCircleElement;

    expect(smallHandle).not.toBeNull();
    expect(largeHandle).not.toBeNull();

    const smallDistance =
      Number(smallHandle.getAttribute("cx")) - Number(smallCenter.getAttribute("cx"));
    const largeDistance =
      Number(largeHandle.getAttribute("cx")) - Number(largeCenter.getAttribute("cx"));

    expect(largeDistance).toBeGreaterThan(smallDistance);
  });
});
