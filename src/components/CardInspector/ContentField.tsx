"use client";

import { useFormContext } from "react-hook-form";

import { useI18n } from "@/i18n/I18nProvider";

type ContentFieldProps = {
  label: string;
};

export default function ContentField({ label }: ContentFieldProps) {
  const { t } = useI18n();
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const fieldError = (errors as Record<string, { message?: string }>).description;

  return (
    <div className="mb-2">
      <label htmlFor="description" className="form-label">
        {label}
      </label>
      <textarea
        id="description"
        className="form-control form-control-sm"
        rows={6}
        style={{ backgroundColor: "#333", color: "#f5f5f5" }}
        title={t("tooltip.rulesAndFlavour")}
        {...register("description", {
          maxLength: {
            value: 2000,
            message: t("errors.contentMaxLength"),
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
