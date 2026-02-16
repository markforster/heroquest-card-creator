"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Palette } from "lucide-react";

import { useOutsideClick } from "@/hooks/useOutsideClick";

type ColorPickerPopoverProps = {
  color: string;
  onColorChange: (value: string) => void;
  resetColor?: string;
  opacity?: number;
  onOpacityChange?: (value: number) => void;
  showOpacity?: boolean;
  disabled?: boolean;
  title?: string;
  labelColor: string;
  labelOpacity?: string;
  labelReset?: string;
  buttonClassName: string;
  buttonActiveClassName: string;
  buttonDisabledClassName: string;
  popoverClassName: string;
  rowClassName: string;
};

export default function ColorPickerPopover({
  color,
  onColorChange,
  resetColor,
  opacity,
  onOpacityChange,
  showOpacity = false,
  disabled = false,
  title,
  labelColor,
  labelOpacity,
  labelReset,
  buttonClassName,
  buttonActiveClassName,
  buttonDisabledClassName,
  popoverClassName,
  rowClassName,
}: ColorPickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const colorInputId = useId();
  const opacityInputId = useId();

  useOutsideClick([buttonRef, popoverRef], () => setIsOpen(false), isOpen);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  const buttonClasses = [
    buttonClassName,
    isOpen ? buttonActiveClassName : "",
    disabled ? buttonDisabledClassName : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={buttonClasses}
        title={title}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Palette size={14} aria-hidden="true" />
      </button>
      {isOpen && !disabled ? (
        <div ref={popoverRef} className={popoverClassName}>
          <div className={rowClassName}>
            <label htmlFor={colorInputId}>{labelColor}</label>
            <div className="d-flex align-items-center gap-2">
              {resetColor && labelReset ? (
                <button
                  type="button"
                  className="border-0 p-0 bg-transparent"
                  title={labelReset}
                  aria-label={labelReset}
                  onClick={() => onColorChange(resetColor)}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 16,
                      display: "inline-block",
                      borderRadius: "999px",
                      backgroundColor: resetColor,
                      border: "1px solid rgba(255,255,255,0.35)",
                    }}
                  />
                </button>
              ) : null}
              <input
                id={colorInputId}
                type="color"
                value={color}
                onChange={(event) => onColorChange(event.target.value)}
              />
            </div>
          </div>
          {showOpacity && onOpacityChange && labelOpacity ? (
            <div className={rowClassName}>
              <label htmlFor={opacityInputId}>{labelOpacity}</label>
              <input
                id={opacityInputId}
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity ?? 0.55}
                onChange={(event) => onOpacityChange(Number(event.target.value))}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
