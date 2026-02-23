"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { useCopyrightSettings } from "@/components/Providers/CopyrightSettingsContext";
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
  const showValue = useWatch({ name: "showCopyright" }) as boolean | undefined;

  const normalizedDefault = defaultCopyright.trim();
  const hasDefault = normalizedDefault.length > 0;
  const normalizedOverride = (overrideValue ?? "").trim();
  const hasOverride = normalizedOverride.length > 0;
  const effectiveVisible = showValue ?? hasOverride ?? hasDefault;

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

  return (
    <div className="mb-2">
      <div className="d-flex align-items-center gap-2 mb-1">
        <label htmlFor="copyright" className="form-label mb-0 flex-grow-1">
          {label}
        </label>
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
      <input
        id="copyright"
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
      <div className="form-text">{t("helper.copyrightUsesDefault")}</div>
    </div>
  );
}
