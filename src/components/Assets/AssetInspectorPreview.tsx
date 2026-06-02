"use client";

import styles from "@/app/page.module.css";
import useBufferedLoadingIndicator from "@/hooks/useBufferedLoadingIndicator";

import { useEffect, useRef, useState } from "react";

import type { CSSProperties, MouseEvent, ReactNode } from "react";

const ASSET_PREVIEW_TILT_MAX_DEG = 8;

type AssetInspectorPreviewProps = {
  previewUrl: string | null;
  isLoading?: boolean;
  alt: string;
  emptyContent: ReactNode;
  interactive?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  containerClassName?: string;
  innerClassName?: string;
  variant?: "inspector" | "modal";
};

export default function AssetInspectorPreview({
  previewUrl,
  isLoading = false,
  alt,
  emptyContent,
  interactive = false,
  onClick,
  ariaLabel,
  containerClassName,
  innerClassName,
  variant = "inspector",
}: AssetInspectorPreviewProps) {
  const previewInnerRef = useRef<HTMLDivElement | null>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const tiltFrameRef = useRef<number | null>(null);
  const tiltPointRef = useRef<{ x: number; y: number } | null>(null);
  const idleFrameRef = useRef<number | null>(null);
  const idleTargetRef = useRef<{ x: number; y: number } | null>(null);
  const idleFromRef = useRef<{ x: number; y: number } | null>(null);
  const idleStartRef = useRef<number | null>(null);
  const idleDurationRef = useRef<number>(0);
  const isHoveringRef = useRef(false);
  const currentTiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const reduceMotionRef = useRef(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const showSpinner = useBufferedLoadingIndicator(isLoading || isImageLoading);

  const resetPreviewTilt = () => {
    const previewEl = previewInnerRef.current;
    if (!previewEl) return;
    previewEl.style.setProperty("--asset-preview-tilt-x", "0deg");
    previewEl.style.setProperty("--asset-preview-tilt-y", "0deg");
    currentTiltRef.current = { x: 0, y: 0 };
  };

  const stopIdleTilt = () => {
    if (idleFrameRef.current !== null) {
      cancelAnimationFrame(idleFrameRef.current);
      idleFrameRef.current = null;
    }
    idleTargetRef.current = null;
    idleFromRef.current = null;
    idleStartRef.current = null;
  };

  const stepIdleTilt = (timestamp: number) => {
    idleFrameRef.current = null;
    if (reduceMotionRef.current || isHoveringRef.current) {
      stopIdleTilt();
      return;
    }
    const previewEl = previewInnerRef.current;
    if (!previewEl) return;

    if (!idleTargetRef.current || idleStartRef.current === null) {
      const maxTilt = 1.8;
      const randTilt = () => (Math.random() * 2 - 1) * maxTilt;
      idleFromRef.current = { ...currentTiltRef.current };
      idleTargetRef.current = { x: randTilt(), y: randTilt() };
      idleStartRef.current = timestamp;
      idleDurationRef.current = 2800 + Math.random() * 2200;
    }

    const start = idleStartRef.current ?? timestamp;
    const duration = idleDurationRef.current || 3000;
    const progress = Math.min(1, (timestamp - start) / duration);
    const ease =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    const target = idleTargetRef.current ?? { x: 0, y: 0 };
    const from = idleFromRef.current ?? { x: 0, y: 0 };
    const nextX = from.x + (target.x - from.x) * ease;
    const nextY = from.y + (target.y - from.y) * ease;

    previewEl.style.setProperty("--asset-preview-tilt-x", `${nextX.toFixed(2)}deg`);
    previewEl.style.setProperty("--asset-preview-tilt-y", `${nextY.toFixed(2)}deg`);
    currentTiltRef.current = { x: nextX, y: nextY };

    if (progress >= 1) {
      idleTargetRef.current = null;
      idleFromRef.current = null;
      idleStartRef.current = null;
    }

    idleFrameRef.current = requestAnimationFrame(stepIdleTilt);
  };

  const startIdleTilt = () => {
    if (reduceMotionRef.current || isHoveringRef.current) return;
    if (idleFrameRef.current !== null) return;
    idleFrameRef.current = requestAnimationFrame(stepIdleTilt);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => {
      reduceMotionRef.current = media.matches;
      if (media.matches) {
        stopIdleTilt();
        resetPreviewTilt();
      }
    };
    handleChange();
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    return () => {
      if (tiltFrameRef.current !== null) {
        cancelAnimationFrame(tiltFrameRef.current);
        tiltFrameRef.current = null;
      }
      stopIdleTilt();
    };
  }, []);

  useEffect(() => {
    stopIdleTilt();
    resetPreviewTilt();
    setIsImageLoading(Boolean(previewUrl) || isLoading);
    if (!reduceMotionRef.current) {
      startIdleTilt();
    }
    return () => {
      stopIdleTilt();
    };
  }, [isLoading, previewUrl, variant]);

  useEffect(() => {
    const image = previewImageRef.current;
    if (isLoading) {
      setIsImageLoading(true);
      return;
    }
    if (!previewUrl || !image) {
      setIsImageLoading(false);
      return;
    }
    if (image.complete) {
      setIsImageLoading(false);
    }
  }, [isLoading, previewUrl]);

  const handlePreviewMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reduceMotionRef.current) return;
    if (!isHoveringRef.current) {
      isHoveringRef.current = true;
      stopIdleTilt();
    }
    tiltPointRef.current = { x: event.clientX, y: event.clientY };
    if (tiltFrameRef.current !== null) return;
    tiltFrameRef.current = requestAnimationFrame(() => {
      tiltFrameRef.current = null;
      const previewEl = previewInnerRef.current;
      const point = tiltPointRef.current;
      if (!previewEl || !point) return;
      const rect = previewEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const normX = (point.x - rect.left) / rect.width - 0.5;
      const normY = (point.y - rect.top) / rect.height - 0.5;
      const tiltX = normY * ASSET_PREVIEW_TILT_MAX_DEG;
      const tiltY = -normX * ASSET_PREVIEW_TILT_MAX_DEG;
      previewEl.style.setProperty("--asset-preview-tilt-x", `${tiltX.toFixed(2)}deg`);
      previewEl.style.setProperty("--asset-preview-tilt-y", `${tiltY.toFixed(2)}deg`);
      currentTiltRef.current = { x: tiltX, y: tiltY };
    });
  };

  const handlePreviewMouseLeave = () => {
    isHoveringRef.current = false;
    tiltPointRef.current = null;
    if (tiltFrameRef.current !== null) {
      cancelAnimationFrame(tiltFrameRef.current);
      tiltFrameRef.current = null;
    }
    resetPreviewTilt();
    startIdleTilt();
  };

  const inner = (
    <div
      className={[
        styles.assetsInspectorPreviewInner,
        interactive && variant === "inspector" ? styles.assetsInspectorPreviewZoomCursor : "",
        variant === "modal" ? styles.assetsInspectorPreviewInnerModal : "",
        innerClassName ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      ref={previewInnerRef}
      onMouseMove={handlePreviewMouseMove}
      onMouseLeave={handlePreviewMouseLeave}
      style={
        previewUrl
          ? ({
              ["--asset-preview-url" as const]: `url("${previewUrl}")`,
            } as CSSProperties)
          : undefined
      }
    >
      {previewUrl ? (
        <>
          {showSpinner ? (
            <div className={styles.assetsInspectorPreviewSpinnerOverlay} aria-hidden="true">
              <div className={styles.spinner} />
            </div>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={previewImageRef}
            src={previewUrl}
            alt={alt}
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
            className={showSpinner ? styles.assetsInspectorPreviewImageLoading : ""}
          />
        </>
      ) : isLoading ? (
        showSpinner ? (
          <div className={styles.assetsInspectorPreviewSpinnerOverlay} aria-hidden="true">
            <div className={styles.spinner} />
          </div>
        ) : null
      ) : (
        <div className={styles.assetsInspectorPreviewPlaceholder}>{emptyContent}</div>
      )}
    </div>
  );

  return (
    <div
      className={[styles.assetsInspectorPreview, containerClassName ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      {interactive && previewUrl && onClick ? (
        <button
          type="button"
          className={`${styles.assetsInspectorPreviewButton} ${styles.assetsInspectorPreviewButtonInteractive}`}
          onClick={onClick}
          aria-label={ariaLabel}
          title={ariaLabel}
        >
          {inner}
        </button>
      ) : (
        <div className={styles.assetsInspectorPreviewButton}>{inner}</div>
      )}
    </div>
  );
}
