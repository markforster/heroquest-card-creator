"use client";

import { PanelBottom, PanelTop } from "lucide-react";
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
  const showTitleValue = useWatch({ name: "showTitle" }) as boolean | undefined;
  const titleDisabled = showToggle && showTitleValue === false;

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
            disabled={titleDisabled}
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
          <div className="btn-group btn-group-sm" role="group" aria-label={t("form.titlePlacement")}>
            <input
              type="radio"
              className="btn-check"
              id="title-placement-top"
              value="top"
              checked={(placementValue ?? "bottom") === "top"}
              disabled={titleDisabled}
              {...register("titlePlacement")}
            />
            <label
              className={`btn btn-outline-secondary ${titleDisabled ? "disabled" : ""}`}
              htmlFor="title-placement-top"
              aria-disabled={titleDisabled}
            >
              <PanelTop size={16} aria-hidden="true" />
            </label>
            <input
              type="radio"
              className="btn-check"
              id="title-placement-bottom"
              value="bottom"
              checked={(placementValue ?? "bottom") === "bottom"}
              disabled={titleDisabled}
              {...register("titlePlacement")}
            />
            <label
              className={`btn btn-outline-secondary ${titleDisabled ? "disabled" : ""}`}
              htmlFor="title-placement-bottom"
              aria-disabled={titleDisabled}
            >
              <PanelBottom size={16} aria-hidden="true" />
            </label>
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
