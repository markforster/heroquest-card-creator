"use client";

import { Move, Rotate3d } from "lucide-react";

import ToolbarButton from "@/components/ToolsToolbar/ToolbarButton";
import ToolbarButtonGroup from "@/components/ToolsToolbar/ToolbarButtonGroup";
import { useWebglPreviewSettings } from "@/components/WebglPreviewSettingsContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function WebglInteractionGroup() {
  const { interactionMode, setInteractionMode } = useWebglPreviewSettings();
  const { t } = useI18n();

  return (
    <ToolbarButtonGroup>
      <ToolbarButton
        isActive={interactionMode === "pan"}
        ariaLabel={t("label.webglPan")}
        title={t("label.webglPan")}
        onClick={() => setInteractionMode("pan")}
      >
        <Move aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        isActive={interactionMode === "orbit"}
        ariaLabel={t("label.webglRotate")}
        title={t("label.webglRotate")}
        onClick={() => setInteractionMode("orbit")}
      >
        <Rotate3d aria-hidden="true" />
      </ToolbarButton>
    </ToolbarButtonGroup>
  );
}
