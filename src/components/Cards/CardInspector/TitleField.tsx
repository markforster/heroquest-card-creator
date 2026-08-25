"use client";

import { BookType, Italic, Link2, PanelBottom, PanelTop, Tag, Type, Unlink2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import {
  EDITOR_TARGET_IDS,
  useInspectorTargetRegistration,
  useSecondaryTargetActionRegistration,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import ColorPickerField from "@/components/common/ColorPickerField";
import { usePreviewCanvas } from "@/components/Providers/PreviewCanvasContext";
import { DEFAULT_TITLE_COLOR } from "@/config/colors";
import { useSmartSwatches } from "@/hooks/useSmartSwatches";
import { useI18n } from "@/i18n/I18nProvider";
import {
  getAlternateTitleTypography,
  getTemplateTitleTypographyDefault,
  normalizeTitleTypographyForStorage,
  resolveTitleTypography,
} from "@/lib/title-typography";
import type { TemplateId } from "@/types/templates";
import type { TitleTypography } from "@/types/title-typography";

import BaseInspectorField from "./BaseInspectorField";

type TitleFieldProps = {
  label: string;
  required?: boolean;
  showToggle?: boolean;
  showPlacement?: boolean;
  showStyleToggle?: boolean;
  showToolbar?: boolean;
  showTitleColor?: boolean;
  templateId?: TemplateId;
};

export default function TitleField({
  label,
  required = true,
  showToggle = false,
  showPlacement = false,
  showStyleToggle = false,
  showToolbar = false,
  showTitleColor = false,
  templateId = "hero",
}: TitleFieldProps) {
  const { t } = useI18n();
  const {
    register,
    formState: { errors },
    setValue,
  } = useFormContext();
  const nameRegistration = register("name", {
    required: `${t("form.name")} ${t("errors.required")}`,
    maxLength: {
      value: 40,
      message: t("errors.titleMaxLength"),
    },
  });
  const titleRegistration = register("title", {
    required: required ? `${label} ${t("errors.required")}` : false,
    maxLength: {
      value: 40,
      message: t("errors.titleMaxLength"),
    },
  });
  const { ref: titleInputRegistrationRef, ...titleInputProps } = titleRegistration;
  const placementValue = useWatch({ name: "titlePlacement" }) as string | undefined;
  const showTitleValue = useWatch({ name: "showTitle" }) as boolean | undefined;
  const nameValue = useWatch({ name: "name" }) as string | undefined;
  const titleValue = useWatch({ name: "title" }) as string | undefined;
  const customNameEnabled = useWatch({ name: "customNameEnabled" }) === true;
  const titleStyleValue = useWatch({ name: "titleStyle" }) as string | undefined;
  const titleTypographyValue = useWatch({ name: "titleTypography" }) as TitleTypography | undefined;
  const titleColorValue = useWatch({ name: "titleColor" }) as string | undefined;
  const titleDisabled = showToggle && showTitleValue === false;
  const placement = placementValue ?? "bottom";
  const titleStyle = titleStyleValue ?? "ribbon";
  const defaultTitleTypography = getTemplateTitleTypographyDefault(templateId);
  const titleTypography = resolveTitleTypography({
    saved: titleTypographyValue,
    defaultTypography: defaultTitleTypography,
  });
  const titleBoldItalic = titleTypography === "boldItalic";
  const titleColor = titleColorValue ?? DEFAULT_TITLE_COLOR;
  const [isTitleColorOpen, setIsTitleColorOpen] = useState(false);
  const { renderPreviewCanvas } = usePreviewCanvas();
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rememberedCustomNameRef = useRef<string | undefined>(undefined);
  const { smartGroups, isSmartBusy, requestSmart } = useSmartSwatches({
    renderPreviewCanvas,
    width: 300,
    height: 420,
  });
  const handleFieldFocusCapture = useInspectorTargetRegistration({
    targetId: EDITOR_TARGET_IDS.title,
    containerRef: fieldRef,
    focusRef: inputRef,
  });
  useSecondaryTargetActionRegistration(
    EDITOR_TARGET_IDS.title,
    showTitleColor && !titleDisabled ? () => setIsTitleColorOpen(true) : null,
  );
  const setTitleInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      titleInputRegistrationRef(node);
    },
    [titleInputRegistrationRef],
  );

  const fieldError = (errors as Record<string, { message?: string }>).title;
  const nameError = (errors as Record<string, { message?: string }>).name;

  const handleCustomNameToggle = () => {
    if (customNameEnabled) {
      rememberedCustomNameRef.current = nameValue ?? "";
      setValue("customNameEnabled", undefined, {
        shouldDirty: true,
        shouldTouch: true,
      });
      return;
    }

    setValue("customNameEnabled", true, {
      shouldDirty: true,
      shouldTouch: true,
    });
    if (rememberedCustomNameRef.current !== undefined) {
      setValue("name", rememberedCustomNameRef.current, {
        shouldDirty: true,
        shouldTouch: true,
      });
      return;
    }
    if (!nameValue?.trim()) {
      setValue("name", titleValue ?? "", {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  };

  const toolbar = showToolbar ? (
    <div className={`${layoutStyles.bodyTextToolbar} d-inline-flex align-items-center gap-1`}>
      {showPlacement ? (
        <button
          type="button"
          className={`${layoutStyles.bodyTextToolbarButton} ${
            titleDisabled ? layoutStyles.bodyTextToolbarButtonDisabled : ""
          }`}
          title={`${t("form.titlePlacement")}: ${
            placement === "top" ? t("label.titlePlacementTop") : t("label.titlePlacementBottom")
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
            <PanelBottom size={14} aria-hidden="true" />
          ) : (
            <PanelTop size={14} aria-hidden="true" />
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
            titleStyle === "ribbon" ? t("tooltip.titleStyleRibbon") : t("tooltip.titleStylePlain")
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
            <Type size={14} aria-hidden="true" />
          ) : (
            <Tag size={14} aria-hidden="true" />
          )}
        </button>
      ) : null}
      <button
        type="button"
        className={`${layoutStyles.bodyTextToolbarButton} ${
          titleBoldItalic ? layoutStyles.bodyTextToolbarButtonActive : ""
        } ${titleDisabled ? layoutStyles.bodyTextToolbarButtonDisabled : ""}`}
        title={t("tooltip.titleBoldItalic")}
        aria-label={t("tooltip.titleBoldItalic")}
        aria-pressed={titleBoldItalic}
        disabled={titleDisabled}
        onClick={() =>
          setValue(
            "titleTypography",
            normalizeTitleTypographyForStorage({
              value: getAlternateTitleTypography(titleTypography),
              defaultTypography: defaultTitleTypography,
            }),
            {
              shouldDirty: true,
              shouldTouch: true,
            },
          )
        }
      >
        <Italic size={14} aria-hidden="true" />
      </button>
    </div>
  ) : null;

  const headerExtras =
    showPlacement && !showToolbar ? (
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
    ) : null;

  const input = (
    <div className={layoutStyles.titleNameControl}>
      <button
        type="button"
        className={`${layoutStyles.titleNameToggle} ${
          customNameEnabled ? layoutStyles.bodyTextToolbarButtonActive : ""
        } ${titleDisabled ? layoutStyles.bodyTextToolbarButtonDisabled : ""}`}
        title={customNameEnabled ? t("tooltip.syncNameToTitle") : t("tooltip.useCustomName")}
        aria-label={customNameEnabled ? t("tooltip.syncNameToTitle") : t("tooltip.useCustomName")}
        aria-pressed={customNameEnabled}
        disabled={titleDisabled}
        onClick={handleCustomNameToggle}
      >
        {customNameEnabled ? (
          <Unlink2 size={14} aria-hidden="true" />
        ) : (
          <Link2 size={14} aria-hidden="true" />
        )}
      </button>
      <div className={layoutStyles.titleNameFields}>
        {customNameEnabled ? (
          <div className={layoutStyles.titleNameFieldRow}>
            <label className={layoutStyles.titleNameInlineLabel} htmlFor="name">
              {t("form.name")}
            </label>
            <input id="name" type="text" className="form-control" {...nameRegistration} />
            {nameError ? (
              <div className="form-text text-danger">
                {nameError.message ?? t("errors.invalidValue")}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className={layoutStyles.titleNameFieldRow}>
          {customNameEnabled ? (
            <label className={layoutStyles.titleNameInlineLabel} htmlFor="title">
              {t("form.title")}
            </label>
          ) : null}
          <div className="d-flex align-items-center gap-2">
            <div style={{ flex: "1 0 auto", minWidth: 0 }}>
              <input
                id="title"
                type="text"
                ref={setTitleInputRef}
                className="form-control"
                disabled={titleDisabled}
                title={t("tooltip.titleShownOnRibbon")}
                {...titleInputProps}
                onChange={(event) => {
                  titleInputProps.onChange(event);
                  if (!customNameEnabled) {
                    setValue("name", event.target.value, {
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }
                }}
              />
            </div>
            {showTitleColor ? (
              <div style={{ flex: "0 1 auto" }}>
                <ColorPickerField
                  label={t("label.color")}
                  showLabel={false}
                  showInput={false}
                  inputValue={titleColor}
                  selectedValue={titleColor}
                  defaultColor={DEFAULT_TITLE_COLOR}
                  smartGroups={smartGroups}
                  isSmartBusy={isSmartBusy}
                  onRequestSmart={requestSmart}
                  onChange={(value) =>
                    setValue("titleColor", value, { shouldDirty: true, shouldTouch: true })
                  }
                  onSelectDefault={() =>
                    setValue("titleColor", DEFAULT_TITLE_COLOR, {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                  onSelectTransparent={() => undefined}
                  canRevert={titleColor !== DEFAULT_TITLE_COLOR}
                  onRevert={() =>
                    setValue("titleColor", DEFAULT_TITLE_COLOR, {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                  isOpen={isTitleColorOpen}
                  onToggleOpen={() => setIsTitleColorOpen((prev) => !prev)}
                  onClose={() => setIsTitleColorOpen(false)}
                  popoverAlign="auto"
                  popoverVAlign="center"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  const footer =
    showStyleToggle && !showToolbar ? (
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
    ) : null;

  return (
    <BaseInspectorField
      id="title"
      label={label}
      icon={BookType}
      fieldRef={fieldRef}
      error={fieldError?.message ?? (fieldError ? t("errors.invalidValue") : null)}
      disabled={titleDisabled}
      onFocusCapture={handleFieldFocusCapture}
      showToggle={showToggle}
      targetId={EDITOR_TARGET_IDS.title}
      toggleProps={
        showToggle
          ? {
              id: "showTitle",
              title: t("tooltip.titleShownOnRibbon"),
              ariaLabel: t("aria.showTitle"),
              inputProps: register("showTitle"),
            }
          : undefined
      }
      toolbar={toolbar}
      headerExtras={headerExtras}
      input={input}
      footer={footer}
    />
  );
}
