"use client";

import styles from "@/app/page.module.css";

import type { ComponentType, ReactNode } from "react";

type IconButtonProps = {
  type?: "button" | "submit";
  className: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
};

export default function IconButton({
  type = "button",
  className,
  icon: Icon,
  children,
  disabled,
  onClick,
  title,
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`${className} d-inline-flex align-items-center`}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      <Icon className={`${styles.icon} ${styles.iconLeft}`} aria-hidden="true" />
      {children}
    </button>
  );
}
