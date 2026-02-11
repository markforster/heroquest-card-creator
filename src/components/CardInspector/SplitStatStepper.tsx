"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useI18n } from "@/i18n/I18nProvider";
import type { StatSplitFormat, StatValue } from "@/types/stats";

import { formatStatInputValue, parseStatInputValue } from "./stat-stepper-input";

import type { FieldValues, Path } from "react-hook-form";

type SplitStatStepperProps<TFormValues extends FieldValues> = {
  name: Path<TFormValues>;
  label: string;
  min?: number;
  max?: number;
  allowWildcard?: boolean;
  splitSecondaryDefault?: number;
};

const DEFAULT_SPLIT_FORMAT: StatSplitFormat = "slash";

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

function readSplitFormat(value: StatValue | undefined): StatSplitFormat {
  if (Array.isArray(value) && value.length >= 4) {
    const format = value[3];
    if (format === "paren" || format === "paren-leading" || format === "slash") {
      return format;
    }
  }
  return DEFAULT_SPLIT_FORMAT;
}

export default function SplitStatStepper<TFormValues extends FieldValues>({
  name,
  label,
  min = 0,
  max = 999,
  allowWildcard = false,
  splitSecondaryDefault = 0,
}: SplitStatStepperProps<TFormValues>) {
  const { t } = useI18n();
  const { control, setValue } = useFormContext<TFormValues>();
  const valueWatch = useWatch({ control, name }) as StatValue | undefined;

  const isArrayValue = Array.isArray(valueWatch);
  const splitFlag = isArrayValue ? valueWatch[2] : undefined;
  const isSplit = isArrayValue ? splitFlag !== 0 : false;
  const primaryValue = isArrayValue ? readNumber(valueWatch[0], 0) : readNumber(valueWatch, 0);
  const secondaryValue = isArrayValue
    ? readNumber(valueWatch[1], splitSecondaryDefault)
    : splitSecondaryDefault;
  const splitFormat = readSplitFormat(valueWatch);

  const resolvedMin = allowWildcard ? Math.min(min, -1) : min;
  const [primaryInput, setPrimaryInput] = useState(formatStatInputValue(primaryValue));
  const [secondaryInput, setSecondaryInput] = useState(formatStatInputValue(secondaryValue));
  const [focusedField, setFocusedField] = useState<"primary" | "secondary" | null>(null);
  const [formatOpen, setFormatOpen] = useState(false);
  const [formatHover, setFormatHover] = useState(false);
  const primaryLastValidRef = useRef(primaryValue);
  const secondaryLastValidRef = useRef(secondaryValue);
  const formatButtonRef = useRef<HTMLButtonElement | null>(null);
  const formatPopoverRef = useRef<HTMLDivElement | null>(null);

  useOutsideClick([formatPopoverRef, formatButtonRef], () => setFormatOpen(false), formatOpen);

  const clampValue = (raw: number) => {
    return Math.min(max, Math.max(resolvedMin, raw));
  };

  const setSingleValue = (next: number) => {
    setValue(name, clampValue(next) as unknown as TFormValues[keyof TFormValues], {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const setSplitValue = (
    nextPrimary: number,
    nextSecondary: number,
    nextFlag: 0 | 1,
    nextFormat: StatSplitFormat = splitFormat,
  ) => {
    setValue(
      name,
      [
        clampValue(nextPrimary),
        clampValue(nextSecondary),
        nextFlag,
        nextFormat,
      ] as unknown as TFormValues[keyof TFormValues],
      {
        shouldDirty: true,
        shouldTouch: true,
      },
    );
  };

  const handleChange = (delta: number, which: "primary" | "secondary") => {
    const currentValue = which === "primary" ? primaryValue : secondaryValue;
    if (currentValue === -1) {
      if (delta > 0) {
        if (!isSplit) {
          if (isArrayValue) {
            if (which === "primary") {
              setSplitValue(0, secondaryValue, 0);
            }
            return;
          }
          setSingleValue(0);
          return;
        }
        if (which === "primary") {
          setSplitValue(0, secondaryValue, 1);
        } else {
          setSplitValue(primaryValue, 0, 1);
        }
      }
      return;
    }
    if (!isSplit) {
      if (isArrayValue) {
        if (which === "primary") {
          setSplitValue(primaryValue + delta, secondaryValue, 0);
        }
        return;
      }
      setSingleValue(primaryValue + delta);
      return;
    }
    if (which === "primary") {
      setSplitValue(primaryValue + delta, secondaryValue, 1);
    } else {
      setSplitValue(primaryValue, secondaryValue + delta, 1);
    }
  };

  const canDecrement = (value: number) => value !== -1 && value > resolvedMin;
  const canIncrement = (value: number) => value === -1 || value < max;

  const toggleSplit = () => {
    if (isSplit) {
      setSplitValue(primaryValue, secondaryValue, 0);
    } else {
      setSplitValue(primaryValue, secondaryValue, 1);
    }
  };

  const handleInputChange =
    (which: "primary" | "secondary") => (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextText = event.target.value;
      if (nextText === "") {
        if (which === "primary") {
          setPrimaryInput("");
        } else {
          setSecondaryInput("");
        }
        return;
      }
      const nextValue = parseStatInputValue(nextText, { min, max, allowWildcard });
      if (nextValue == null) return;
      if (which === "primary") {
        primaryLastValidRef.current = nextValue;
        setPrimaryInput(formatStatInputValue(nextValue));
      } else {
        secondaryLastValidRef.current = nextValue;
        setSecondaryInput(formatStatInputValue(nextValue));
      }
      if (!isSplit) {
        if (isArrayValue) {
          if (which === "primary") {
            setSplitValue(nextValue, secondaryValue, 0);
          }
          return;
        }
        setSingleValue(nextValue);
        return;
      }
      if (which === "primary") {
        setSplitValue(nextValue, secondaryValue, 1);
      } else {
        setSplitValue(primaryValue, nextValue, 1);
      }
    };

  const handlePaste =
    (which: "primary" | "secondary", currentValue: number) =>
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = event.clipboardData.getData("text");
      const inputValue = formatStatInputValue(currentValue);
      const selectionStart = event.currentTarget.selectionStart ?? 0;
      const selectionEnd = event.currentTarget.selectionEnd ?? 0;
      const nextText = `${inputValue.slice(0, selectionStart)}${pasted}${inputValue.slice(selectionEnd)}`;
      const nextValue = parseStatInputValue(nextText, { min, max, allowWildcard });
      if (nextValue == null) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      if (which === "primary") {
        primaryLastValidRef.current = nextValue;
        setPrimaryInput(formatStatInputValue(nextValue));
      } else {
        secondaryLastValidRef.current = nextValue;
        setSecondaryInput(formatStatInputValue(nextValue));
      }
      if (!isSplit) {
        if (isArrayValue) {
          if (which === "primary") {
            setSplitValue(nextValue, secondaryValue, 0);
          }
          return;
        }
        setSingleValue(nextValue);
        return;
      }
      if (which === "primary") {
        setSplitValue(nextValue, secondaryValue, 1);
      } else {
        setSplitValue(primaryValue, nextValue, 1);
      }
    };

  const handleBlur = (which: "primary" | "secondary") => {
    setFocusedField((current) => (current === which ? null : current));
    if (which === "primary" && primaryInput === "") {
      setPrimaryInput(formatStatInputValue(primaryLastValidRef.current));
    }
    if (which === "secondary" && secondaryInput === "") {
      setSecondaryInput(formatStatInputValue(secondaryLastValidRef.current));
    }
  };

  useEffect(() => {
    primaryLastValidRef.current = primaryValue;
    if (focusedField !== "primary") {
      setPrimaryInput(formatStatInputValue(primaryValue));
    }
  }, [primaryValue, focusedField]);

  useEffect(() => {
    secondaryLastValidRef.current = secondaryValue;
    if (focusedField !== "secondary") {
      setSecondaryInput(formatStatInputValue(secondaryValue));
    }
  }, [secondaryValue, focusedField]);

  useEffect(() => {
    if (!isSplit) {
      setFormatOpen(false);
    }
  }, [isSplit]);

  const handleFormatChange = (nextFormat: StatSplitFormat) => {
    setSplitValue(primaryValue, secondaryValue, 1, nextFormat);
    setFormatOpen(false);
  };

  const optionSlashLabel = "x / y";
  const optionParenLabel = "x ( y )";
  const optionParenLeadingLabel = "( x ) y";
  const formatButtonLabel =
    splitFormat === "paren-leading"
      ? optionParenLeadingLabel
      : splitFormat === "paren"
        ? optionParenLabel
        : optionSlashLabel;

  const renderStatField = (value: number, which: "primary" | "secondary") => (
    <div className={layoutStyles.statField}>
      <input
        className={layoutStyles.statValueInput}
        title={`${t("tooltip.valueFor")} ${label}`}
        aria-label={t("tooltip.valueFor")}
        value={which === "primary" ? primaryInput : secondaryInput}
        onChange={handleInputChange(which)}
        onPaste={handlePaste(which, value)}
        onFocus={() => setFocusedField(which)}
        onBlur={() => handleBlur(which)}
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
      />
      <div className={layoutStyles.statButtons}>
        <button
          type="button"
          className={`${layoutStyles.statIconButton} ${layoutStyles.statIconButtonMinus}`}
          title={`${t("tooltip.decrease")} ${label}`}
          onClick={() => handleChange(-1, which)}
          disabled={!canDecrement(value)}
        >
          -
        </button>
        <button
          type="button"
          className={`${layoutStyles.statIconButton} ${layoutStyles.statIconButtonPlus}`}
          title={`${t("tooltip.increase")} ${label}`}
          onClick={() => handleChange(1, which)}
          disabled={!canIncrement(value)}
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className={layoutStyles.statCell}>
      <div className={layoutStyles.statControlRow}>
        <div className={layoutStyles.statSubLabel}>{label}</div>
        <div className={layoutStyles.statSplitFields}>
          {renderStatField(primaryValue, "primary")}
          <div
            className={`${layoutStyles.statSplitButtons} ${
              isSplit ? layoutStyles.statSplitButtonsStacked : layoutStyles.statSplitButtonsSingle
            }`}
          >
            {isSplit ? (
              <div className={layoutStyles.statFormatWrapper}>
                <button
                  ref={formatButtonRef}
                  type="button"
                  className={`${layoutStyles.statIconButton} ${layoutStyles.statFormatButton}`}
                  title={t("tooltip.statFormat")}
                  aria-label={t("tooltip.statFormat")}
                  aria-haspopup="menu"
                  aria-expanded={formatOpen}
                  onClick={() => setFormatOpen((current) => !current)}
                  onMouseEnter={() => setFormatHover(true)}
                  onMouseLeave={() => setFormatHover(false)}
                >
                  <span className={layoutStyles.statFormatLabel}>{formatButtonLabel}</span>
                </button>
                {formatHover && !formatOpen ? (
                  <div className={layoutStyles.statFormatHoverPopover} role="status">
                    {formatButtonLabel}
                  </div>
                ) : null}
                {formatOpen ? (
                  <div
                    ref={formatPopoverRef}
                    className={layoutStyles.statFormatPopover}
                    role="menu"
                  >
                    <button
                      type="button"
                      className={layoutStyles.statFormatOption}
                      onClick={() => handleFormatChange("slash")}
                      role="menuitem"
                    >
                      {optionSlashLabel}
                    </button>
                    <button
                      type="button"
                      className={layoutStyles.statFormatOption}
                      onClick={() => handleFormatChange("paren")}
                      role="menuitem"
                    >
                      {optionParenLabel}
                    </button>
                    <button
                      type="button"
                      className={layoutStyles.statFormatOption}
                      onClick={() => handleFormatChange("paren-leading")}
                      role="menuitem"
                    >
                      {optionParenLeadingLabel}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              className={`${layoutStyles.statIconButton} ${layoutStyles.statChevronButton}`}
              title={isSplit ? t("tooltip.removeSecondValue") : t("tooltip.addSecondValue")}
              aria-label={isSplit ? t("tooltip.removeSecondValue") : t("tooltip.addSecondValue")}
              onClick={toggleSplit}
            >
              {isSplit ? (
                <ChevronRight className={layoutStyles.icon} aria-hidden="true" />
              ) : (
                <ChevronLeft className={layoutStyles.icon} aria-hidden="true" />
              )}
            </button>
          </div>
          {isSplit ? renderStatField(secondaryValue, "secondary") : null}
        </div>
      </div>
    </div>
  );
}
