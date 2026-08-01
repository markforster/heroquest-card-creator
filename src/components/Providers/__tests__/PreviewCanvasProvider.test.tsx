import { renderHook } from "@testing-library/react";

import type { CardPreviewHandle } from "@/components/Cards/CardPreview";
import {
  PreviewCanvasProvider,
  usePreviewCanvas,
} from "@/components/Providers/PreviewCanvasContext";

import type { ReactNode, RefObject } from "react";

describe("PreviewCanvasProvider", () => {
  it("returns null without a preview handle", async () => {
    const previewRef = { current: null } as RefObject<CardPreviewHandle>;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PreviewCanvasProvider previewRef={previewRef}>{children}</PreviewCanvasProvider>
    );

    await expect(
      renderHook(() => usePreviewCanvas(), { wrapper }).result.current.renderPreviewCanvas(),
    ).resolves.toBeNull();
  });

  it("delegates rendering options to the preview handle", async () => {
    const canvas = document.createElement("canvas");
    const renderToCanvas = jest.fn().mockResolvedValue(canvas);
    const previewRef = { current: { renderToCanvas } } as unknown as RefObject<CardPreviewHandle>;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PreviewCanvasProvider previewRef={previewRef}>{children}</PreviewCanvasProvider>
    );
    const { result } = renderHook(() => usePreviewCanvas(), { wrapper });

    await expect(result.current.renderPreviewCanvas({ width: 100 })).resolves.toBe(canvas);
    expect(renderToCanvas).toHaveBeenCalledWith({ width: 100 });
  });
});
