"use client";

import { Move, Rotate3d } from "lucide-react";

import ToolbarButton from "@/components/ToolsToolbar/ToolbarButton";
import ToolbarButtonGroup from "@/components/ToolsToolbar/ToolbarButtonGroup";
import { usePreviewRenderer } from "@/components/PreviewRendererContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function WebglInteractionGroup() {
  const { rotationMode, setRotationMode } = usePreviewRenderer();
  const { t } = useI18n();

  return (
    <ToolbarButtonGroup>
      <ToolbarButton
        isActive={rotationMode === "pan"}
        ariaLabel={t("label.webglPan")}
        title={t("label.webglPan")}
        onClick={() => setRotationMode("pan")}
      >
        <Move aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        isActive={rotationMode === "spin"}
        ariaLabel={t("label.webglRotate")}
        title={t("label.webglRotate")}
        onClick={() => setRotationMode("spin")}
      >
        <Rotate3d aria-hidden="true" />
      </ToolbarButton>
    </ToolbarButtonGroup>
  );
}
