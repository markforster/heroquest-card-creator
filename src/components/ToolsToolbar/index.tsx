"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRef } from "react";

import styles from "@/app/page.module.css";
import { previewRendererFlags, usePreviewRenderer } from "@/components/PreviewRendererContext";
import RendererToggleGroup from "@/components/ToolsToolbar/RendererToggleGroup";
import TextFittingSettingsPopover from "@/components/TextFittingSettings/TextFittingSettingsPopover";
import ToolbarButton from "@/components/ToolsToolbar/ToolbarButton";
import ToolbarButtonGroup from "@/components/ToolsToolbar/ToolbarButtonGroup";
import WebglInteractionGroup from "@/components/ToolsToolbar/WebglInteractionGroup";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { usePopupState } from "@/hooks/usePopupState";
import { useWebglSupport } from "@/hooks/useWebglSupport";
import { useI18n } from "@/i18n/I18nProvider";

export default function ToolsToolbar() {
  const { t } = useI18n();
  const { previewRenderer, setPreviewRenderer } = usePreviewRenderer();
  const { SHOW_WEBGL_TOGGLE } = previewRendererFlags;
  const isWebglSupported = useWebglSupport(previewRenderer, setPreviewRenderer);
  const showWebglControls = previewRenderer === "webgl";
  const textPrefsPopup = usePopupState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useOutsideClick([popoverRef, buttonRef], textPrefsPopup.close, textPrefsPopup.isOpen);

  if (!SHOW_WEBGL_TOGGLE || !isWebglSupported) {
    return null;
  }

  return (
    <div className={styles.toolsToolbar} aria-label={t("label.previewRenderer")}>
      <ToolbarButtonGroup>
        <ToolbarButton
          buttonRef={buttonRef}
          isActive={textPrefsPopup.isOpen}
          ariaLabel={t("label.textFittingSettings")}
          title={t("label.textFittingSettings")}
          onClick={textPrefsPopup.toggle}
        >
          <SlidersHorizontal aria-hidden="true" />
        </ToolbarButton>
      </ToolbarButtonGroup>
      <RendererToggleGroup />
      {showWebglControls ? (
        <WebglInteractionGroup />
      ) : null}
      {textPrefsPopup.isOpen ? <TextFittingSettingsPopover popoverRef={popoverRef} /> : null}
    </div>
  );
}
