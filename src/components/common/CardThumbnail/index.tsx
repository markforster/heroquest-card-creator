"use client";

import styles from "./CardThumbnail.module.css";

import type { ReactNode } from "react";

export type CardThumbnailVariant = "xs" | "sm" | "md" | "lg";
export type CardThumbnailFit = "cover" | "contain";

type CardThumbnailProps = {
  src?: string | null;
  alt: string;
  variant: CardThumbnailVariant;
  fit?: CardThumbnailFit;
  className?: string;
  imageClassName?: string;
  fallback?: ReactNode;
  onLoad?: () => void;
};

export default function CardThumbnail({
  src,
  alt,
  variant,
  fit = "cover",
  className,
  imageClassName,
  fallback,
  onLoad,
}: CardThumbnailProps) {
  const variantClass = styles[`size${variant.toUpperCase()}`];
  const fitClass = fit === "contain" ? styles.fitContain : styles.fitCover;
  const containerClassName = [styles.container, variantClass, className].filter(Boolean).join(" ");
  const imgClassName = [styles.image, fitClass, imageClassName].filter(Boolean).join(" ");

  return (
    <div className={containerClassName}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={imgClassName} onLoad={onLoad} />
      ) : (
        fallback ?? <div className={styles.fallback} />
      )}
    </div>
  );
}
