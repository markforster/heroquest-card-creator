"use client";

import { useFormContext } from "react-hook-form";

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
        title={`Select a value for ${label}`}
        {...register(name, {
          valueAsNumber: true,
          min: {
            value: min,
            message: `Must be at least ${min}`,
          },
          max: {
            value: max,
            message: `Must be at most ${max}`,
          },
        })}
      >
        {options}
      </select>
      {fieldError ? (
        <div className="form-text text-danger">{String(fieldError.message ?? "Invalid value")}</div>
      ) : null}
    </div>
  );
}
