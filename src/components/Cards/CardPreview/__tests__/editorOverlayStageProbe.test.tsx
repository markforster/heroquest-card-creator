import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

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

jest.mock("@/hooks/useAssetImageUrl", () => ({
  __esModule: true,
  useAssetImageUrl: (assetId?: string) => {
    if (assetId === "icon-1") {
      return {
        url: "blob:icon-1",
        status: "ready",
        width: 160,
        height: 120,
      };
    }

    return {
      url: null,
      status: assetId ? "missing" : "idle",
      width: null,
      height: null,
    };
  },
}));

describe("CardPreview editor overlay stage probe", () => {
  const originalImage = global.Image;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  function SelectTarget({
    targetId,
  }: {
    targetId: (typeof EDITOR_TARGET_IDS)[keyof typeof EDITOR_TARGET_IDS];
  }) {
    const { setSelectedTargetId } = useEditorTargets();

    useEffect(() => {
      setSelectedTargetId(targetId);
    }, [setSelectedTargetId, targetId]);

    return null;
  }

  function SelectImageMainTarget() {
    return <SelectTarget targetId={EDITOR_TARGET_IDS.imageMain} />;
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

  function SelectedTargetProbe() {
    const { selectedTargetId } = useEditorTargets();

    return <output data-testid="selected-target">{selectedTargetId ?? ""}</output>;
  }

  function FormValueProbe() {
    const values = useWatch({
      name: ["imageAssetId", "imageOriginalWidth", "imageOriginalHeight"],
    }) as [string | undefined, number | undefined, number | undefined];

    return (
      <output
        data-testid="form-values"
        data-image-asset-id={values[0] ?? ""}
        data-image-original-width={values[1] ?? ""}
        data-image-original-height={values[2] ?? ""}
      />
    );
  }

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null);
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
    HTMLCanvasElement.prototype.getContext = originalGetContext;
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
        <SelectTarget targetId={EDITOR_TARGET_IDS.imageMain} />
        <SelectedTargetProbe />
        <PreviewFormHarness
          defaultValues={{
            title: "Hero",
            imageAssetId: "asset-1",
            imageOriginalWidth: 1400,
            imageOriginalHeight: 1800,
          }}
        >
          <FormValueProbe />
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
    expect(container.querySelector('[data-editor-image-frame="true"]')).toHaveAttribute(
      "stroke",
      "rgba(34, 211, 238, 0.88)",
    );
    expect(container.querySelector('[data-editor-image-arm="true"]')).toHaveAttribute(
      "stroke",
      "rgba(34, 211, 238, 0.88)",
    );
  });

  it("extends the transform arm as image scale increases", async () => {
    const { container: smallContainer } = render(
        <EditorTargetsProvider>
        <SelectTarget targetId={EDITOR_TARGET_IDS.imageMain} />
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
        <SelectTarget targetId={EDITOR_TARGET_IDS.imageMain} />
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

  it("clears the selected target when the preview background is clicked", async () => {
    const { container } = render(
      <EditorTargetsProvider>
        <SelectImageMainTarget />
        <SelectedTargetProbe />
        <PreviewFormHarness
          defaultValues={{
            title: "Hero",
            imageAssetId: "asset-1",
            imageOriginalWidth: 1400,
            imageOriginalHeight: 1800,
          }}
        >
          <FormValueProbe />
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

    expect(screen.getByTestId("selected-target")).toHaveTextContent(EDITOR_TARGET_IDS.imageMain);

    const svg = container.querySelector("svg");
    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected preview svg");
    }

    await act(async () => {
      fireEvent.click(svg);
    });

    expect(screen.getByTestId("selected-target")).toHaveTextContent("");
    expect(container.querySelector('[data-editor-image-frame="true"]')).toBeNull();
  });

  it("renders a preview-only image frame when image.icon is selected", async () => {
    const { container } = render(
      <EditorTargetsProvider>
        <SelectTarget targetId={EDITOR_TARGET_IDS.imageIcon} />
        <PreviewFormHarness
          defaultValues={{
            title: "Monster",
            description: "A monster with an icon.",
            iconAssetId: "icon-1",
            iconAssetName: "Monster icon",
            iconScale: 1,
            iconRotation: 0,
            iconOffsetX: 0,
            iconOffsetY: 0,
          }}
        >
          <CardPreview
            templateId="monster"
            templateName="Monster"
            cardData={{
              title: "Monster",
              description: "A monster with an icon.",
              iconAssetId: "icon-1",
              iconAssetName: "Monster icon",
              iconScale: 1,
              iconRotation: 0,
              iconOffsetX: 0,
              iconOffsetY: 0,
            }}
          />
        </PreviewFormHarness>
      </EditorTargetsProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('[data-editor-image-frame="true"]')).not.toBeNull();
    expect(container.querySelector('[data-editor-overlay="true"]')).toHaveAttribute(
      "data-editor-image-target",
      EDITOR_TARGET_IDS.imageIcon,
    );
  });

  it("preserves selection when the transform handle is clicked", async () => {
    const { container } = render(
      <EditorTargetsProvider>
        <SelectImageMainTarget />
        <SelectedTargetProbe />
        <PreviewFormHarness
          defaultValues={{
            title: "Hero",
            imageAssetId: "asset-1",
            imageOriginalWidth: 1400,
            imageOriginalHeight: 1800,
          }}
        >
          <FormValueProbe />
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

    const transformHandle = container.querySelector('[data-editor-image-transform-handle="true"]');
    if (!(transformHandle instanceof SVGElement)) {
      throw new Error("Expected transform handle");
    }

    await act(async () => {
      fireEvent.click(transformHandle);
    });

    expect(screen.getByTestId("selected-target")).toHaveTextContent(EDITOR_TARGET_IDS.imageMain);
    expect(container.querySelector('[data-editor-image-frame="true"]')).not.toBeNull();
  });
});
