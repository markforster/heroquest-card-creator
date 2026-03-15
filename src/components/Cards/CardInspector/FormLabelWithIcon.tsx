"use client";

import styles from "@/app/page.module.css";

import type { LucideIcon } from "lucide-react";


type FormLabelWithIconProps = {
  label: string;
  icon: LucideIcon;
  htmlFor?: string;
  className?: string;
};

export default function FormLabelWithIcon({
  label,
  icon: Icon,
  htmlFor,
  className,
}: FormLabelWithIconProps) {
  return (
    <label htmlFor={htmlFor} className={`${styles.inspectorLabel} ${className ?? ""}`.trim()}>
      <Icon className={styles.inspectorLabelIcon} aria-hidden="true" size={16} />
      <span>{label}</span>
    </label>
  );
}
