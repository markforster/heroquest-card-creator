"use client";

import { useFormContext } from "react-hook-form";

type TitleFieldProps = {
  label: string;
  required?: boolean;
};

export default function TitleField({ label, required = true }: TitleFieldProps) {
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
        title="Title shown on the card ribbon"
        {...register("title", {
          required: required ? `${label} is required` : false,
          maxLength: {
            value: 40,
            message: "Title must be at most 40 characters",
          },
        })}
      />
      {fieldError ? (
        <div className="form-text text-danger">
          {String(fieldError.message ?? "Invalid value")}
        </div>
      ) : null}
    </div>
  );
}
