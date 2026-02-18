"use client";

import styles from "@/app/page.module.css";

import type { ComponentType, ReactNode, Ref } from "react";

type IconButtonProps = {
  type?: "button" | "submit";
  className: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  iconOnly?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
};

export default function IconButton({
  type = "button",
  className,
  icon: Icon,
  children,
  disabled,
  onClick,
  title,
  iconOnly = false,
  buttonRef,
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`${className} d-inline-flex align-items-center ${
        iconOnly ? "justify-content-center" : ""
      }`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      ref={buttonRef}
    >
      <Icon
        className={`${styles.icon} ${iconOnly ? "" : styles.iconLeft}`}
        aria-hidden="true"
      />
      {children}
    </button>
  );
}
