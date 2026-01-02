"use client";

import { useFormContext } from "react-hook-form";

import { useI18n } from "@/i18n/I18nProvider";

type TitleFieldProps = {
  label: string;
  required?: boolean;
};

export default function TitleField({ label, required = true }: TitleFieldProps) {
  const { t } = useI18n();
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const fieldError = (errors as Record<string, { message?: string }>).title;

  return (
    <div className="mb-2">
      <label htmlFor="title" className="form-label">
        {label}
      </label>
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
