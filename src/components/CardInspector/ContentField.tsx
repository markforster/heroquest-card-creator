"use client";

import { useFormContext } from "react-hook-form";

type ContentFieldProps = {
  label: string;
};

export default function ContentField({ label }: ContentFieldProps) {
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
        title="Rules and flavour text shown in the body of the card"
        {...register("description", {
          maxLength: {
            value: 2000,
            message: "Content must be at most 2000 characters",
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
