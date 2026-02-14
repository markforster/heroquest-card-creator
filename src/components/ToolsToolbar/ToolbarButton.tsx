"use client";

import styles from "@/app/page.module.css";

import type { ReactNode, Ref } from "react";

type ToolbarButtonProps = {
  ariaLabel: string;
  title: string;
  onClick: () => void;
  children: ReactNode;
  isActive?: boolean;
  ariaPressed?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
};

export default function ToolbarButton({
  ariaLabel,
  title,
  onClick,
  children,
  isActive = false,
  ariaPressed,
  buttonRef,
}: ToolbarButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`btn btn-sm btn-outline-light ${styles.toolsToolbarButton} ${
        isActive ? "active" : ""
      }`}
      aria-pressed={ariaPressed ?? isActive}
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
