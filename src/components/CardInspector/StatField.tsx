"use client";

import { useFormContext } from "react-hook-form";

import { useI18n } from "@/i18n/I18nProvider";

import type { FieldValues, Path } from "react-hook-form";

type StatFieldProps<TFormValues extends FieldValues> = {
  name: Path<TFormValues>;
  label: string;
  min?: number;
  max?: number;
};

export default function StatField<TFormValues extends FieldValues>({
  name,
  label,
  min = 0,
  max = 10,
}: StatFieldProps<TFormValues>) {
  const { t } = useI18n();
  const {
    register,
    formState: { errors },
  } = useFormContext<TFormValues>();

  const fieldError = (errors as Record<string, { message?: string }>)[name as string];

  const options = [];
  for (let value = min; value <= max; value += 1) {
    options.push(
      <option key={value} value={value}>
        {value}
      </option>,
    );
  }

  return (
    <div className="mb-2">
      <label className="form-label" htmlFor={String(name)}>
        {label}
      </label>
      <select
        id={String(name)}
        className="form-select form-select-sm"
        title={`${t("tooltip.selectValueFor")} ${label}`}
        {...register(name, {
          valueAsNumber: true,
          min: {
            value: min,
            message: `${t("errors.minValue")} ${min}`,
          },
          max: {
            value: max,
            message: `${t("errors.maxValue")} ${max}`,
          },
        })}
      >
        {options}
      </select>
      {fieldError ? (
        <div className="form-text text-danger">
          {String(fieldError.message ?? t("errors.invalidValue"))}
        </div>
      ) : null}
    </div>
  );
}
