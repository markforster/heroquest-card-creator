"use client";
/* eslint-disable @next/next/no-img-element */

import heroBackJustLogo from "@/assets/card-backgrounds/hero-back-just-logo.png";
import { useHeroBackLogoImageUrl } from "@/hooks/useHeroBackLogoImageUrl";

import styles from "./HeroBackLogoPreviewTile.module.css";

type HeroBackLogoPreviewTileProps = {
  variant: "default" | "custom";
  logoId?: string;
  ariaLabel?: string;
  maxHeight?: number;
  className?: string;
  testId?: string;
  showBorder?: boolean;
};

export default function HeroBackLogoPreviewTile({
  variant,
  logoId,
  ariaLabel,
  maxHeight = 64,
  className,
  testId,
  showBorder = true,
}: HeroBackLogoPreviewTileProps) {
  const { url } = useHeroBackLogoImageUrl(variant === "custom" ? logoId : undefined);
  const src = variant === "default" ? heroBackJustLogo.src : url;

  return (
    <div
      className={`${styles.tile}${className ? ` ${className}` : ""}${showBorder ? ` ${styles.withBorder}` : ""}`}
      data-testid={testId}
      data-preview-variant={variant}
      style={{ height: `${maxHeight}px` }}
    >
      {src ? (
        <img src={src} alt={ariaLabel ?? ""} className={styles.image} draggable="false" />
      ) : null}
    </div>
  );
}
