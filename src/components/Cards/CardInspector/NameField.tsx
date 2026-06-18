"use client";

import { BookType } from "lucide-react";
import { useFormContext } from "react-hook-form";

import { useI18n } from "@/i18n/I18nProvider";

import BaseInspectorField from "./BaseInspectorField";

type NameFieldProps = {
  label: string;
  required?: boolean;
};

export default function NameField({ label, required = true }: NameFieldProps) {
  const { t } = useI18n();
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const fieldError = (errors as Record<string, { message?: string }>).name;

  return (
    <BaseInspectorField
      id="name"
      label={label}
      icon={BookType}
      error={fieldError?.message ?? (fieldError ? t("errors.invalidValue") : null)}
      input={
        <input
          id="name"
          type="text"
          className="form-control"
          {...register("name", {
            required: required ? `${label} ${t("errors.required")}` : false,
            maxLength: {
              value: 40,
              message: t("errors.titleMaxLength"),
            },
          })}
        />
      }
    />
  );
}
