"use client";

import { PanelBottom, PanelTop, Tag, Type } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { DEFAULT_TITLE_COLOR } from "@/config/colors";
import { useI18n } from "@/i18n/I18nProvider";

import ColorPickerPopover from "./ColorPickerPopover";

type TitleFieldProps = {
  label: string;
  required?: boolean;
  showToggle?: boolean;
  showPlacement?: boolean;
  showStyleToggle?: boolean;
  showToolbar?: boolean;
  showTitleColor?: boolean;
};

export default function TitleField({
  label,
  required = true,
  showToggle = false,
  showPlacement = false,
  showStyleToggle = false,
  showToolbar = false,
  showTitleColor = false,
}: TitleFieldProps) {
  const { t } = useI18n();
  const {
    register,
    formState: { errors },
    setValue,
  } = useFormContext();
  const placementValue = useWatch({ name: "titlePlacement" }) as string | undefined;
  const showTitleValue = useWatch({ name: "showTitle" }) as boolean | undefined;
  const titleStyleValue = useWatch({ name: "titleStyle" }) as string | undefined;
  const titleColorValue = useWatch({ name: "titleColor" }) as string | undefined;
  const titleDisabled = showToggle && showTitleValue === false;
  const placement = placementValue ?? "bottom";
  const titleStyle = titleStyleValue ?? "ribbon";
  const titleColor = titleColorValue ?? DEFAULT_TITLE_COLOR;

  const fieldError = (errors as Record<string, { message?: string }>).title;

  return (
    <div className="mb-2">
      <div className="d-flex align-items-center gap-2 mb-1">
        <div className="flex-grow-1 flex-shrink-0">
          <label htmlFor="title" className="form-label mb-0">
            {label}
          </label>
        </div>
        {showToolbar ? (
          <div className={layoutStyles.bodyTextToolbar}>
            {showPlacement ? (
              <button
                type="button"
                className={`${layoutStyles.bodyTextToolbarButton} ${
                  titleDisabled ? layoutStyles.bodyTextToolbarButtonDisabled : ""
                }`}
                title={`${t("form.titlePlacement")}: ${
                  placement === "top"
                    ? t("label.titlePlacementTop")
                    : t("label.titlePlacementBottom")
                }`}
                disabled={titleDisabled}
                onClick={() =>
                  setValue("titlePlacement", placement === "top" ? "bottom" : "top", {
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                }
              >
                {placement === "top" ? (
                  <PanelTop size={14} aria-hidden="true" />
                ) : (
                  <PanelBottom size={14} aria-hidden="true" />
                )}
              </button>
            ) : null}
            {showStyleToggle ? (
              <button
                type="button"
                className={`${layoutStyles.bodyTextToolbarButton} ${
                  titleDisabled ? layoutStyles.bodyTextToolbarButtonDisabled : ""
                }`}
                title={
                  titleStyle === "ribbon"
                    ? t("tooltip.titleStyleRibbon")
                    : t("tooltip.titleStylePlain")
                }
                disabled={titleDisabled}
                onClick={() =>
                  setValue("titleStyle", titleStyle === "ribbon" ? "plain" : "ribbon", {
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                }
              >
                {titleStyle === "ribbon" ? (
                  <Tag size={14} aria-hidden="true" />
                ) : (
                  <Type size={14} aria-hidden="true" />
                )}
              </button>
            ) : null}
            {showTitleColor ? (
              <ColorPickerPopover
                color={titleColor}
                onColorChange={(value) =>
                  setValue("titleColor", value, { shouldDirty: true, shouldTouch: true })
                }
                resetColor={DEFAULT_TITLE_COLOR}
                disabled={titleDisabled}
                title={t("tooltip.titleColor")}
                labelColor={t("label.color")}
                labelReset={t("label.resetColor")}
                buttonClassName={layoutStyles.bodyTextToolbarButton}
                buttonActiveClassName={layoutStyles.bodyTextToolbarButtonActive}
                buttonDisabledClassName={layoutStyles.bodyTextToolbarButtonDisabled}
                popoverClassName={layoutStyles.bodyTextToolbarPopover}
                rowClassName={layoutStyles.bodyTextToolbarRow}
              />
            ) : null}
          </div>
        ) : null}
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
        {showPlacement && !showToolbar ? (
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
      {showStyleToggle && !showToolbar ? (
        <div className="d-flex align-items-center gap-2 mt-2">
          <div className="btn-group btn-group-sm" role="group" aria-label={t("form.titleStyle")}>
            <input
              type="radio"
              className="btn-check"
              id="title-style-ribbon"
              value="ribbon"
              checked={(titleStyleValue ?? "ribbon") === "ribbon"}
              disabled={titleDisabled}
              {...register("titleStyle")}
            />
            <label
              className={`btn btn-outline-secondary ${titleDisabled ? "disabled" : ""}`}
              htmlFor="title-style-ribbon"
              aria-disabled={titleDisabled}
              title={t("tooltip.titleStyleRibbon")}
            >
              {t("label.titleStyleRibbon")}
            </label>
            <input
              type="radio"
              className="btn-check"
              id="title-style-plain"
              value="plain"
              checked={(titleStyleValue ?? "ribbon") === "plain"}
              disabled={titleDisabled}
              {...register("titleStyle")}
            />
            <label
              className={`btn btn-outline-secondary ${titleDisabled ? "disabled" : ""}`}
              htmlFor="title-style-plain"
              aria-disabled={titleDisabled}
              title={t("tooltip.titleStylePlain")}
            >
              {t("label.titleStylePlain")}
            </label>
          </div>
        </div>
      ) : null}
      {fieldError ? (
        <div className="form-text text-danger">
          {String(fieldError.message ?? t("errors.invalidValue"))}
        </div>
      ) : null}
    </div>
  );
}
