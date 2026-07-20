"use client";

import { useId } from "react";

import styles from "@/app/page.module.css";
import { getInlineDiceSvgUrl } from "@/lib/inline-dice";

import type { InlineDiceConfiguratorState } from "@/lib/inline-dice";

type BodyTextDicePreviewProps = {
  config: InlineDiceConfiguratorState;
  size?: "small" | "large" | "inline";
};

export default function BodyTextDicePreview({
  config,
  size = "small",
}: BodyTextDicePreviewProps) {
  const rawId = useId();
  const maskId = `body-text-dice-mask-${rawId.replace(/[:]/g, "")}`;
  const src = getInlineDiceSvgUrl(config.type, config.faceOrValue);

  return (
    <span
      className={`${styles.bodyTextDiceChip} ${size === "large" ? styles.bodyTextDiceChipLarge : ""} ${
        size === "inline" ? styles.bodyTextDiceChipInline : ""
      }`}
      style={{
        backgroundColor: config.backgroundColor,
        borderColor: config.symbolColor,
      }}
      aria-hidden="true"
    >
      <svg
        className={styles.bodyTextDiceImage}
        viewBox="0 0 48 48"
        role="img"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="10"
          ry="10"
          fill={config.backgroundColor}
          stroke={config.symbolColor}
          strokeWidth="2"
        />
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x="10"
          y="10"
          width="28"
          height="28"
        >
          <image href={src} x="10" y="10" width="28" height="28" />
        </mask>
        <rect
          x="10"
          y="10"
          width="28"
          height="28"
          fill={config.symbolColor}
          mask={`url(#${maskId})`}
        />
      </svg>
    </span>
  );
}
