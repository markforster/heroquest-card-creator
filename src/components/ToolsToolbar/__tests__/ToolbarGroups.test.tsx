const setPreviewRenderer = jest.fn();
const setRotationMode = jest.fn();

jest.mock("@/components/Providers/PreviewRendererContext", () => ({
  usePreviewRenderer: () => ({
    previewRenderer: "svg",
    setPreviewRenderer,
    rotationMode: "pan",
    setRotationMode,
  }),
}));
jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

import { fireEvent, render, screen } from "@testing-library/react";

import RendererToggleGroup from "@/components/ToolsToolbar/RendererToggleGroup";
import WebglInteractionGroup from "@/components/ToolsToolbar/WebglInteractionGroup";

describe("toolbar renderer controls", () => {
  it("switches preview renderer and WebGL interaction modes", () => {
    render(
      <>
        <RendererToggleGroup />
        <WebglInteractionGroup />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "label.previewRendererWebgl" }));
    fireEvent.click(screen.getByRole("button", { name: "label.webglRotate" }));
    expect(setPreviewRenderer).toHaveBeenCalledWith("webgl");
    expect(setRotationMode).toHaveBeenCalledWith("spin");
  });
});
