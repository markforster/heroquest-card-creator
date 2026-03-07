"use client";

import { Copyright } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import FormLabelWithIcon from "@/components/Cards/CardInspector/FormLabelWithIcon";
import ColorPickerField from "@/components/common/ColorPickerField";
import { useCopyrightSettings } from "@/components/Providers/CopyrightSettingsContext";
import { usePreviewCanvas } from "@/components/Providers/PreviewCanvasContext";
import { DEFAULT_COPYRIGHT_COLOR } from "@/config/colors";
import { useSmartSwatches } from "@/hooks/useSmartSwatches";
import { useI18n } from "@/i18n/I18nProvider";

type CopyrightFieldProps = {
  label: string;
  placeholder?: string;
  showToggle?: boolean;
};

export default function CopyrightField({
  label,
  placeholder,
  showToggle = false,
}: CopyrightFieldProps) {
  const { t } = useI18n();
  const { register, setValue } = useFormContext();
  const { defaultCopyright, isReady } = useCopyrightSettings();
  const overrideValue = useWatch({ name: "copyright" }) as string | undefined;
  const colorValue = useWatch({ name: "copyrightColor" }) as string | undefined;
  const showValue = useWatch({ name: "showCopyright" }) as boolean | undefined;
  const [isColorOpen, setIsColorOpen] = useState(false);
  const { renderPreviewCanvas } = usePreviewCanvas();
  const { smartGroups, isSmartBusy, requestSmart } = useSmartSwatches({
    renderPreviewCanvas,
    width: 300,
    height: 420,
  });

  const normalizedDefault = defaultCopyright.trim();
  const hasDefault = normalizedDefault.length > 0;
  const normalizedOverride = (overrideValue ?? "").trim();
  const hasOverride = normalizedOverride.length > 0;
  const effectiveVisible = showValue ?? hasOverride ?? hasDefault;
  const normalizedColor = typeof colorValue === "string" ? colorValue.trim() : "";
  const selectedColor = normalizedColor || DEFAULT_COPYRIGHT_COLOR;
  const inputId = "copyright";

  useEffect(() => {
    if (!showToggle || !isReady) return;
    if (typeof showValue === "boolean") return;
    if (hasDefault && !hasOverride) {
      setValue("showCopyright", true, { shouldDirty: false });
    }
  }, [showToggle, isReady, showValue, hasDefault, hasOverride, setValue]);

  const handleToggle = () => {
    const next = !effectiveVisible;
    setValue("showCopyright", next, { shouldDirty: true, shouldTouch: true });
  };

  const handleSelectAuto = () => {
    setValue("copyrightColor", undefined, { shouldDirty: true, shouldTouch: true });
  };

  return (
    <div className="mb-2">
      <div className={`d-flex align-items-center gap-2 ${layoutStyles.inspectorFieldHeader}`}>
        <FormLabelWithIcon
          htmlFor={inputId}
          label={label}
          icon={Copyright}
          className="form-label mb-0 flex-grow-1"
        />
        {showToggle ? (
          <label className="form-check form-switch m-0">
            <input
              id="showCopyright"
              type="checkbox"
              className="form-check-input hq-toggle"
              checked={Boolean(effectiveVisible)}
              onChange={handleToggle}
              aria-label={t("form.showCopyright")}
              title={t("form.showCopyright")}
            />
          </label>
        ) : null}
      </div>
      <div className="d-flex align-items-center gap-2">
        <div style={{ flex: "1 0 auto", minWidth: 0 }}>
          <input
            id={inputId}
            type="text"
            className="form-control form-control-sm"
            placeholder={placeholder ?? (hasDefault ? normalizedDefault : undefined)}
            disabled={!effectiveVisible}
            {...register("copyright", {
              maxLength: {
                value: 120,
                message: t("errors.contentMaxLength"),
              },
            })}
          />
        </div>
        <div style={{ flex: "0 1 auto" }}>
          <ColorPickerField
            label={t("label.color")}
            showLabel={false}
            showInput={false}
            inputValue={selectedColor}
            selectedValue={selectedColor}
            defaultColor={DEFAULT_COPYRIGHT_COLOR}
            smartGroups={smartGroups}
            isSmartBusy={isSmartBusy}
            onRequestSmart={requestSmart}
            onChange={(value) =>
              setValue("copyrightColor", value, { shouldDirty: true, shouldTouch: true })
            }
            onSelectDefault={handleSelectAuto}
            onSelectTransparent={() =>
              setValue("copyrightColor", "transparent", { shouldDirty: true, shouldTouch: true })
            }
            canRevert={normalizedColor.length > 0}
            onRevert={handleSelectAuto}
            isOpen={isColorOpen}
            onToggleOpen={() => setIsColorOpen((prev) => !prev)}
            onClose={() => setIsColorOpen(false)}
            popoverAlign="auto"
            popoverVAlign="center"
            isDisabled={!effectiveVisible}
          />
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={handleSelectAuto}
            disabled={!effectiveVisible || normalizedColor.length === 0}
            title={t("actions.auto")}
          >
            {t("actions.auto")}
          </button>
        </div>
      </div>
      <div className="form-text">{t("helper.copyrightUsesDefault")}</div>
    </div>
  );
}
