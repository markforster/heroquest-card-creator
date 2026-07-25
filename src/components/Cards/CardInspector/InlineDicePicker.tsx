"use client";

import { Copy, Dices } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "@/app/page.module.css";
import BodyTextDicePreview from "@/components/Cards/CardInspector/BodyTextDicePreview";
import { computeCardInspectorPopoverPosition } from "@/components/Cards/CardInspector/card-inspector-popover-position";
import InlineDiceDualColorField from "@/components/Cards/CardInspector/InlineDiceDualColorField";
import SegmentedControl from "@/components/common/SegmentedControl";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useI18n } from "@/i18n/I18nProvider";
import {
  buildInlineDiceToken,
  DICE_COLORS,
  D6_FACES,
  DETAIL_DICE_FACES,
  getInlineDiceDefaultSymbolColor,
  ICON_DICE_FACES,
  INLINE_DICE_PRESET_COLORS,
} from "@/lib/inline-dice";

import {
  loadInlineDiceRecents,
  pushInlineDiceRecent,
} from "./inline-dice-recents";

import type {
  InlineDiceConfiguratorState,
  InlineDiceConfiguratorType,
  InlineDiceConfiguratorValue,
} from "@/lib/inline-dice";

type InlineDicePickerProps = {
  disabled?: boolean;
  onInsert: (token: string) => void;
};

const DEFAULT_BACKGROUND_COLOR = "#FFFFFF";
const D6_DEFAULT_CONFIG: InlineDiceConfiguratorState = {
  type: "d6",
  faceOrValue: D6_FACES[0],
  backgroundColor: DICE_COLORS.red.toUpperCase(),
  symbolColor: DICE_COLORS.white.toUpperCase(),
};

const ICON_DEFAULT_CONFIG: InlineDiceConfiguratorState = {
  type: "icon",
  faceOrValue: ICON_DICE_FACES[0],
  backgroundColor: DICE_COLORS.white.toUpperCase(),
  symbolColor: DICE_COLORS.black.toUpperCase(),
};

const DETAIL_DEFAULT_CONFIG: InlineDiceConfiguratorState = {
  type: "detail",
  faceOrValue: DETAIL_DICE_FACES[0],
  backgroundColor: DICE_COLORS.yellow.toUpperCase(),
  symbolColor: DICE_COLORS.black.toUpperCase(),
};

function getDefaultConfig(type: InlineDiceConfiguratorType): InlineDiceConfiguratorState {
  if (type === "d6") return { ...D6_DEFAULT_CONFIG };
  if (type === "icon") return { ...ICON_DEFAULT_CONFIG };
  return { ...DETAIL_DEFAULT_CONFIG };
}

function getFacePreviewConfig(
  type: InlineDiceConfiguratorType,
  faceOrValue: InlineDiceConfiguratorValue,
): InlineDiceConfiguratorState {
  if (type === "d6") {
    return {
      ...D6_DEFAULT_CONFIG,
      faceOrValue: faceOrValue as (typeof D6_FACES)[number],
    };
  }

  if (type === "icon") {
    return {
      ...ICON_DEFAULT_CONFIG,
      faceOrValue: faceOrValue as (typeof ICON_DICE_FACES)[number],
    };
  }

  const detailPreviewConfigMap: Record<
    (typeof DETAIL_DICE_FACES)[number],
    Pick<InlineDiceConfiguratorState, "backgroundColor" | "symbolColor">
  > = {
    cd: {
      backgroundColor: DICE_COLORS.white.toUpperCase(),
      symbolColor: DICE_COLORS.black.toUpperCase(),
    },
    ad: {
      backgroundColor: DICE_COLORS.red.toUpperCase(),
      symbolColor: DICE_COLORS.white.toUpperCase(),
    },
    dd: {
      backgroundColor: DICE_COLORS.black.toUpperCase(),
      symbolColor: DICE_COLORS.white.toUpperCase(),
    },
    md: {
      backgroundColor: DICE_COLORS.green.toUpperCase(),
      symbolColor: DICE_COLORS.white.toUpperCase(),
    },
  };

  return {
    type: "detail",
    faceOrValue: faceOrValue as (typeof DETAIL_DICE_FACES)[number],
    ...detailPreviewConfigMap[faceOrValue as (typeof DETAIL_DICE_FACES)[number]],
  };
}

function getDefaultPresetConfigs(type: InlineDiceConfiguratorType): InlineDiceConfiguratorState[] {
  if (type === "d6") {
    return D6_FACES.map((faceOrValue) => ({
      ...D6_DEFAULT_CONFIG,
      faceOrValue,
    }));
  }

  if (type === "icon") {
    return ICON_DICE_FACES.map((faceOrValue) => ({
      ...ICON_DEFAULT_CONFIG,
      faceOrValue,
    }));
  }

  return DETAIL_DICE_FACES.map((faceOrValue) => getFacePreviewConfig("detail", faceOrValue));
}

export default function InlineDicePicker({
  disabled = false,
  onInsert,
}: InlineDicePickerProps) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<{ left: number; top: number } | null>(null);
  const [config, setConfig] = useState<InlineDiceConfiguratorState>(getDefaultConfig("d6"));
  const [recents, setRecents] = useState(loadInlineDiceRecents);
  const backgroundColorPopoverRef = useRef<HTMLDivElement | null>(null);
  const symbolColorPopoverRef = useRef<HTMLDivElement | null>(null);

  useOutsideClick(
    [buttonRef, popoverRef, backgroundColorPopoverRef, symbolColorPopoverRef],
    () => setIsOpen(false),
    isOpen,
  );

  const handleBackgroundPopoverElementChange = useCallback((element: HTMLDivElement | null) => {
    backgroundColorPopoverRef.current = element;
  }, []);

  const handleSymbolPopoverElementChange = useCallback((element: HTMLDivElement | null) => {
    symbolColorPopoverRef.current = element;
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setPopoverStyle(null);
      return;
    }

    const position = () => {
      const nextPosition = computeCardInspectorPopoverPosition(buttonRef.current, popoverRef.current, {
        minWidth: 336,
        maxWidth: 420,
      });
      if (!nextPosition) return;
      setPopoverStyle({ left: nextPosition.left, top: nextPosition.top });
    };

    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);

    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setRecents(loadInlineDiceRecents());
  }, [isOpen]);

  const token = useMemo(() => buildInlineDiceToken(config), [config]);
  const defaultPresets = useMemo(() => getDefaultPresetConfigs(config.type), [config.type]);

  const typeOptions: Array<{
    value: InlineDiceConfiguratorType;
    label: string;
    prefix: React.ReactNode;
  }> = [
    {
      value: "d6",
      label: t("option.diceTypeD6"),
      prefix: (
        <BodyTextDicePreview
          config={{ ...D6_DEFAULT_CONFIG, faceOrValue: D6_FACES[D6_FACES.length - 1] }}
          size="inline"
        />
      ),
    },
    {
      value: "icon",
      label: t("option.diceTypeIcon"),
      prefix: <BodyTextDicePreview config={ICON_DEFAULT_CONFIG} size="inline" />,
    },
    {
      value: "detail",
      label: t("option.diceTypeDetail"),
      prefix: <BodyTextDicePreview config={DETAIL_DEFAULT_CONFIG} size="inline" />,
    },
  ];

  const faceOptions = useMemo(() => {
    if (config.type === "d6") {
      return D6_FACES.map((value) => ({
        value,
        ariaLabel: `${t("label.diceValue")} ${value}`,
      }));
    }

    if (config.type === "icon") {
      return ICON_DICE_FACES.map((value) => ({
        value,
        ariaLabel:
          value === "skull"
            ? t("formattingHelp.dice.skull")
            : value === "hero"
              ? t("formattingHelp.dice.heroShield")
              : t("formattingHelp.dice.monsterShield"),
      }));
    }

    return DETAIL_DICE_FACES.map((value) => ({
      value,
      ariaLabel: value.toUpperCase(),
    }));
  }, [config.type, t]);

  const updateConfig = (nextPartial: Partial<InlineDiceConfiguratorState>) => {
    setConfig((current) => ({ ...current, ...nextPartial }));
  };

  const handleTypeChange = (type: InlineDiceConfiguratorType) => {
    setConfig(getDefaultConfig(type));
  };

  const handleBackgroundColorChange = (backgroundColor: string) => {
    setConfig((current) => {
      const currentDefault = getInlineDiceDefaultSymbolColor(current.backgroundColor);
      const nextDefault = getInlineDiceDefaultSymbolColor(backgroundColor);
      const shouldFollowDefault =
        current.symbolColor.toUpperCase() === currentDefault.toUpperCase();

      return {
        ...current,
        backgroundColor,
        symbolColor: shouldFollowDefault ? nextDefault : current.symbolColor,
      };
    });
  };

  const updateRecents = (nextConfig: InlineDiceConfiguratorState) => {
    setRecents((current) => pushInlineDiceRecent(current, nextConfig));
  };

  const handleInsert = () => {
    updateRecents(config);
    onInsert(token);
    setIsOpen(false);
  };

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(token);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = token;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      updateRecents(config);
    } catch {
      // Ignore clipboard errors and keep the picker open.
    }
  };

  const handleRecentSelect = (recentConfig: InlineDiceConfiguratorState) => {
    setConfig(recentConfig);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.helpIconButton} ${disabled ? styles.bodyTextToolbarButtonDisabled : ""}`}
        title={t("tooltip.insertInlineDice")}
        aria-label={t("tooltip.insertInlineDice")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setIsOpen((current) => {
            const nextIsOpen = !current;
            if (nextIsOpen) {
              setConfig(getDefaultConfig("d6"));
            }
            return nextIsOpen;
          });
        }}
      >
        <Dices className={styles.icon} aria-hidden="true" />
      </button>
      {isClient && isOpen
        ? createPortal(
            <div
              ref={popoverRef}
              className={styles.bodyTextPickerPopover}
              style={popoverStyle ?? { visibility: "hidden" }}
              role="dialog"
              aria-label={t("heading.inlineDiceConfigurator")}
            >
                <div className={styles.bodyTextPickerBody}>
                  <div className={`${styles.bodyTextPickerSection} ${styles.bodyTextPickerSectionNavDivider}`}>
                    <div
                      className={styles.bodyTextPickerCenteredControl}
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      <SegmentedControl
                        ariaLabel={t("label.diceType")}
                        options={typeOptions}
                        value={config.type}
                        onChange={handleTypeChange}
                      />
                    </div>
                  </div>

                <div className={styles.bodyTextPickerSection}>
                  <div className={styles.bodyTextDiceControlsRow}>
                    <div className={styles.bodyTextDiceControlsFaceField}>
                      <div className={styles.bodyTextPickerFieldLabel}>{t("label.diceFace")}</div>
                      <div
                        className={`${styles.bodyTextDiceOptionGrid} ${
                          config.type === "d6"
                            ? styles.bodyTextDiceOptionGridSix
                            : styles.bodyTextDiceOptionGridFour
                        }`}
                      >
                        {faceOptions.map((option) => (
                          <button
                            key={String(option.value)}
                            type="button"
                            className={`${styles.bodyTextDiceOption} ${
                              config.faceOrValue === option.value ? styles.bodyTextDiceOptionActive : ""
                            }`}
                            aria-label={option.ariaLabel}
                            aria-pressed={config.faceOrValue === option.value}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => updateConfig({ faceOrValue: option.value })}
                          >
                            <BodyTextDicePreview config={getFacePreviewConfig(config.type, option.value)} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.bodyTextPickerSection}>
                  <div className={styles.bodyTextPickerFieldLabel}>{t("label.diceDefaults")}</div>
                  <div className={styles.bodyTextDiceRecentGrid}>
                    {defaultPresets.map((preset) => {
                      const presetToken = buildInlineDiceToken(preset);

                      return (
                        <button
                          key={presetToken}
                          type="button"
                          className={`${styles.bodyTextDiceRecent} ${
                            presetToken === token ? styles.bodyTextDiceOptionActive : ""
                          }`}
                          aria-label={presetToken}
                          aria-pressed={presetToken === token}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setConfig(preset)}
                        >
                          <BodyTextDicePreview config={preset} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.bodyTextPickerSection}>
                  <div className={styles.bodyTextPickerFieldLabel}>{t("label.diceRecents")}</div>
                  <div className={styles.bodyTextDiceRecentGrid}>
                    {recents.length > 0 ? (
                      recents.map((entry) => (
                        <button
                          key={entry.token}
                          type="button"
                          className={styles.bodyTextDiceRecent}
                          aria-label={entry.token}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleRecentSelect(entry)}
                        >
                          <BodyTextDicePreview config={entry} />
                        </button>
                      ))
                    ) : (
                      <div className={styles.bodyTextDiceRecentEmpty}>{t("empty.noRecentDiceTokens")}</div>
                    )}
                  </div>
                </div>

                <div className={`${styles.bodyTextPickerSection} ${styles.bodyTextPickerSectionDivider}`}>
                  <div className={styles.bodyTextDiceTokenRow}>
                    <div className={styles.bodyTextDiceControlsColorField}>
                      <div className={styles.bodyTextPickerFieldLabel}>{t("label.color")}</div>
                      <InlineDiceDualColorField
                        frontLabel={t("label.diceSymbolColor")}
                        backLabel={t("label.backgroundColor")}
                        frontColor={config.symbolColor}
                        backColor={config.backgroundColor}
                        frontDefaultColor={getInlineDiceDefaultSymbolColor(config.backgroundColor)}
                        backDefaultColor={getDefaultConfig(config.type).backgroundColor}
                        presetSwatches={INLINE_DICE_PRESET_COLORS}
                        onFrontColorChange={(symbolColor) => updateConfig({ symbolColor })}
                        onBackColorChange={handleBackgroundColorChange}
                        onFrontPopoverElementChange={handleSymbolPopoverElementChange}
                        onBackPopoverElementChange={handleBackgroundPopoverElementChange}
                        disabled={disabled}
                      />
                    </div>
                    <div className={styles.bodyTextDiceTokenField}>
                      <div className={styles.bodyTextPickerFieldLabel}>{t("label.diceToken")}</div>
                      <input
                        type="text"
                        className={styles.bodyTextTokenField}
                        value={token}
                        readOnly
                        aria-label={t("label.diceToken")}
                      />
                    </div>
                    <div className={styles.bodyTextDiceControlsPreviewField}>
                      <div className={styles.bodyTextPickerFieldLabel}>{t("label.preview")}</div>
                      <div className={styles.bodyTextDicePreviewPanel}>
                        <BodyTextDicePreview config={config} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.bodyTextPickerActions}>
                  <button
                    type="button"
                    className={`btn btn-primary btn-sm ${styles.bodyTextPickerActionButton}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={handleInsert}
                  >
                    {t("actions.insert")}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline-secondary btn-sm ${styles.bodyTextPickerActionButton}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      void handleCopy();
                    }}
                  >
                    <Copy size={14} aria-hidden="true" />
                    <span>{t("actions.copy")}</span>
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
