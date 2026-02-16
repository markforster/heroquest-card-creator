"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { useI18n } from "@/i18n/I18nProvider";

type TitleFieldProps = {
  label: string;
  required?: boolean;
  showToggle?: boolean;
  showPlacement?: boolean;
};

export default function TitleField({
  label,
  required = true,
  showToggle = false,
  showPlacement = false,
}: TitleFieldProps) {
  const { t } = useI18n();
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const placementValue = useWatch({ name: "titlePlacement" }) as string | undefined;

  const fieldError = (errors as Record<string, { message?: string }>).title;

  return (
    <div className="mb-2">
      <div className="d-flex align-items-center gap-2 mb-1">
        <div className="flex-grow-1 flex-shrink-0">
          <label htmlFor="title" className="form-label mb-0">
            {label}
          </label>
        </div>
        {showToggle ? (
          <div className="flex-grow-0 flex-shrink-1 form-check form-switch m-0">
            <input
              id="showTitle"
              type="checkbox"
              className="form-check-input hq-toggle"
              title={t("tooltip.titleShownOnRibbon")}
              aria-label={t("aria.showTitle")}
              role="switch"
              {...register("showTitle")}
            />
          </div>
        ) : null}
      </div>
      <div className="d-flex align-items-center gap-2">
        <div style={{ flex: "1 0 auto", minWidth: 0 }}>
          <input
            id="title"
            type="text"
            className="form-control"
            title={t("tooltip.titleShownOnRibbon")}
            {...register("title", {
              required: required ? `${label} ${t("errors.required")}` : false,
              maxLength: {
                value: 40,
                message: t("errors.titleMaxLength"),
              },
            })}
          />
        </div>
        {showPlacement ? (
          <div style={{ flex: "0 1 auto" }}>
            <select
              id="titlePlacement"
              className="form-select form-select-sm"
              style={{ width: "4em" }}
              value={placementValue ?? "bottom"}
              {...register("titlePlacement")}
            >
              <option value="top">{t("label.titlePlacementTop")}</option>
              <option value="bottom">{t("label.titlePlacementBottom")}</option>
            </select>
          </div>
        ) : null}
      </div>
      {fieldError ? (
        <div className="form-text text-danger">
          {String(fieldError.message ?? t("errors.invalidValue"))}
        </div>
      ) : null}
    </div>
  );
}
