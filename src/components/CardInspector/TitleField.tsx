"use client";

import { useFormContext } from "react-hook-form";

import { useI18n } from "@/i18n/I18nProvider";

type TitleFieldProps = {
  label: string;
  required?: boolean;
  showToggle?: boolean;
};

export default function TitleField({
  label,
  required = true,
  showToggle = false,
}: TitleFieldProps) {
  const { t } = useI18n();
  const {
    register,
    formState: { errors },
  } = useFormContext();

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
      <input
        id="title"
        type="text"
        className="form-control form-control-sm"
        title={t("tooltip.titleShownOnRibbon")}
        {...register("title", {
          required: required ? `${label} ${t("errors.required")}` : false,
          maxLength: {
            value: 40,
            message: t("errors.titleMaxLength"),
          },
        })}
      />
      {fieldError ? (
        <div className="form-text text-danger">
          {String(fieldError.message ?? t("errors.invalidValue"))}
        </div>
      ) : null}
    </div>
  );
}
