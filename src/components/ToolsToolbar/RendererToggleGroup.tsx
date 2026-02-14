"use client";

import { Box, Square } from "lucide-react";

import { usePreviewRenderer } from "@/components/PreviewRendererContext";
import ToolbarButton from "@/components/ToolsToolbar/ToolbarButton";
import ToolbarButtonGroup from "@/components/ToolsToolbar/ToolbarButtonGroup";
import { useI18n } from "@/i18n/I18nProvider";

export default function RendererToggleGroup() {
  const { previewRenderer, setPreviewRenderer } = usePreviewRenderer();
  const { t } = useI18n();

  return (
    <ToolbarButtonGroup>
      <ToolbarButton
        isActive={previewRenderer === "svg"}
        ariaLabel={t("label.previewRendererSvg")}
        title={t("label.previewRendererSvg")}
        onClick={() => setPreviewRenderer("svg")}
      >
        <Square aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        isActive={previewRenderer === "webgl"}
        ariaLabel={t("label.previewRendererWebgl")}
        title={t("label.previewRendererWebgl")}
        onClick={() => setPreviewRenderer("webgl")}
      >
        <Box aria-hidden="true" />
      </ToolbarButton>
    </ToolbarButtonGroup>
  );
}
