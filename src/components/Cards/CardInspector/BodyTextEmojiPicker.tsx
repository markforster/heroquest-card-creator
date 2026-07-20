"use client";

import { SmilePlus } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "@/app/page.module.css";
import { computeCardInspectorPopoverPosition } from "@/components/Cards/CardInspector/card-inspector-popover-position";
import { useTheme } from "@/components/Providers/ThemeProvider";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useI18n } from "@/i18n/I18nProvider";

import csData from "emoji-picker-react/dist/data/emojis-en";
import daData from "emoji-picker-react/dist/data/emojis-da";
import deData from "emoji-picker-react/dist/data/emojis-de";
import elData from "emoji-picker-react/dist/data/emojis-en";
import enData from "emoji-picker-react/dist/data/emojis-en-gb";
import esData from "emoji-picker-react/dist/data/emojis-es";
import fiData from "emoji-picker-react/dist/data/emojis-fi";
import frData from "emoji-picker-react/dist/data/emojis-fr";
import huData from "emoji-picker-react/dist/data/emojis-hu";
import itData from "emoji-picker-react/dist/data/emojis-it";
import nbData from "emoji-picker-react/dist/data/emojis-nb";
import nlData from "emoji-picker-react/dist/data/emojis-nl";
import plData from "emoji-picker-react/dist/data/emojis-pl";
import ptBrData from "emoji-picker-react/dist/data/emojis-pt";
import ptData from "emoji-picker-react/dist/data/emojis-pt";
import ruData from "emoji-picker-react/dist/data/emojis-ru";
import svData from "emoji-picker-react/dist/data/emojis-sv";

import { EmojiStyle, Theme } from "emoji-picker-react";

import type { EmojiClickData, EmojiData } from "emoji-picker-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

const EMOJI_DATA_BY_LANGUAGE: Record<string, EmojiData> = {
  cs: csData,
  da: daData,
  de: deData,
  el: elData,
  en: enData,
  es: esData,
  fi: fiData,
  fr: frData,
  hu: huData,
  it: itData,
  nb: nbData,
  nl: nlData,
  pl: plData,
  pt: ptData,
  "pt-BR": ptBrData,
  ru: ruData,
  sv: svData,
};

type BodyTextEmojiPickerProps = {
  disabled?: boolean;
  onInsert: (emoji: string) => void;
};

export default function BodyTextEmojiPicker({
  disabled = false,
  onInsert,
}: BodyTextEmojiPickerProps) {
  const { language, t } = useI18n();
  const { resolvedTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<{ left: number; top: number } | null>(null);
  const [isClient, setIsClient] = useState(false);

  const emojiData = useMemo(() => EMOJI_DATA_BY_LANGUAGE[language] ?? enData, [language]);
  const emojiPickerTheme = resolvedTheme === "light" ? Theme.LIGHT : Theme.DARK;

  useOutsideClick([buttonRef, popoverRef], () => setIsOpen(false), isOpen);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setPopoverStyle(null);
      return;
    }

    const position = () => {
      const nextPosition = computeCardInspectorPopoverPosition(buttonRef.current, popoverRef.current, {
        minWidth: 320,
        maxWidth: 360,
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

  const handleEmojiClick = (emojiDataValue: EmojiClickData) => {
    onInsert(emojiDataValue.emoji);
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.helpIconButton} ${disabled ? styles.bodyTextToolbarButtonDisabled : ""}`}
        title={t("tooltip.insertEmoji")}
        aria-label={t("tooltip.insertEmoji")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <SmilePlus className={styles.icon} aria-hidden="true" />
      </button>
      {isClient && isOpen
        ? createPortal(
            <div
              ref={popoverRef}
              className={styles.bodyTextPickerPopover}
              style={popoverStyle ?? { visibility: "hidden" }}
              role="dialog"
              aria-label={t("tooltip.insertEmoji")}
            >
              <EmojiPicker
                open
                className={styles.bodyTextEmojiPicker}
                emojiData={emojiData}
                onEmojiClick={handleEmojiClick}
                searchDisabled
                skinTonesDisabled
                lazyLoadEmojis
                autoFocusSearch={false}
                previewConfig={{ showPreview: false }}
                width="100%"
                height={360}
                emojiStyle={EmojiStyle.NATIVE}
                theme={emojiPickerTheme}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
