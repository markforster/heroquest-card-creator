"use client";

import styles from "@/app/page.module.css";

type LeftNavSpacerProps = {
  size?: "small" | "medium" | "large";
  showLine?: boolean;
};

const spacerClassMap = {
  small: styles.leftNavSpacerSmall,
  medium: styles.leftNavSpacerMedium,
  large: styles.leftNavSpacerLarge,
} as const;

export default function LeftNavSpacer({
  size = "small",
  showLine = true,
}: LeftNavSpacerProps) {
  return (
    <div
      className={`${styles.leftNavSpacer} ${spacerClassMap[size]} ${
        showLine ? styles.leftNavSpacerLine : ""
      }`}
      aria-hidden="true"
    />
  );
}
