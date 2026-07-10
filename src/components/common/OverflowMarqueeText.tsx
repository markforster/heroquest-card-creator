"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import styles from "@/app/page.module.css";

type OverflowMarqueeTextProps = {
  text: string;
  active?: boolean;
  className?: string;
  viewportClassName?: string;
  trackClassName?: string;
};

const INITIAL_DELAY_MS = 600;
const END_PAUSE_MS = 600;
const START_PAUSE_MS = 800;
const PIXELS_PER_SECOND = 40;
const MIN_SCROLL_DURATION_MS = 900;
const MAX_SCROLL_DURATION_MS = 6000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function OverflowMarqueeText({
  text,
  active,
  className,
  viewportClassName,
  trackClassName,
}: OverflowMarqueeTextProps) {
  const viewportRef = useRef<HTMLSpanElement | null>(null);
  const trackRef = useRef<HTMLSpanElement | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const overflowDistanceRef = useRef(0);
  const [overflowDistance, setOverflowDistance] = useState(0);
  const [isActiveInternal, setIsActiveInternal] = useState(false);
  const [transformX, setTransformX] = useState(0);
  const [transitionMs, setTransitionMs] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const isActive = active ?? isActiveInternal;

  overflowDistanceRef.current = overflowDistance;

  const clearCycle = useCallback(() => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  }, []);

  const measureOverflow = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const viewportWidth = viewport.getBoundingClientRect().width;
    const trackWidth = Math.max(track.scrollWidth, track.getBoundingClientRect().width);
    const nextOverflow = Math.max(0, Math.ceil(trackWidth - viewportWidth));
    overflowDistanceRef.current = nextOverflow;
    setOverflowDistance(nextOverflow);
  }, []);

  const resetToOrigin = useCallback(() => {
    clearCycle();
    const track = trackRef.current;
    if (track) {
      track.style.transitionProperty = "none";
      track.style.transitionDuration = "0ms";
      track.style.transform = "translate3d(0px, 0, 0)";
      void track.offsetWidth;
    }
    setTransitionMs(0);
    setTransformX(0);
  }, [clearCycle]);

  const runCycle = useCallback(() => {
    clearCycle();

    const distance = overflowDistanceRef.current;
    if (distance <= 0 || prefersReducedMotion) {
      resetToOrigin();
      return;
    }

    const scrollDurationMs = clamp(
      Math.round((distance / PIXELS_PER_SECOND) * 1000),
      MIN_SCROLL_DURATION_MS,
      MAX_SCROLL_DURATION_MS,
    );

    setTransitionMs(0);
    setTransformX(0);

    const initialDelayTimeout = window.setTimeout(() => {
      setTransitionMs(scrollDurationMs);
      setTransformX(-distance);

      const pauseAtEndTimeout = window.setTimeout(() => {
        setTransitionMs(scrollDurationMs);
        setTransformX(0);

        const pauseAtStartTimeout = window.setTimeout(() => {
          if (isActive) {
            runCycle();
          }
        }, scrollDurationMs + START_PAUSE_MS);

        timeoutsRef.current.push(pauseAtStartTimeout);
      }, scrollDurationMs + END_PAUSE_MS);

      timeoutsRef.current.push(pauseAtEndTimeout);
    }, INITIAL_DELAY_MS);

    timeoutsRef.current.push(initialDelayTimeout);
  }, [clearCycle, isActive, prefersReducedMotion, resetToOrigin]);

  useLayoutEffect(() => {
    measureOverflow();
  }, [active, measureOverflow, text]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener?.("change", handleChange);

    return () => {
      mediaQuery.removeEventListener?.("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const observer = new ResizeObserver(() => {
      measureOverflow();
    });

    observer.observe(viewport);
    observer.observe(track);

    return () => observer.disconnect();
  }, [measureOverflow, text]);

  useEffect(() => {
    if (!isActive || prefersReducedMotion || overflowDistance <= 0) {
      resetToOrigin();
      return;
    }

    runCycle();

    return () => {
      clearCycle();
    };
  }, [clearCycle, isActive, overflowDistance, prefersReducedMotion, resetToOrigin, runCycle]);

  useEffect(() => {
    return () => {
      clearCycle();
    };
  }, [clearCycle]);

  return (
    <span
      className={[styles.overflowMarquee, className].filter(Boolean).join(" ")}
      data-overflowing={overflowDistance > 0 ? "true" : "false"}
      data-marquee-active={isActive && overflowDistance > 0 && !prefersReducedMotion ? "true" : "false"}
      onMouseEnter={() => {
        if (active !== undefined) return;
        measureOverflow();
        setIsActiveInternal(true);
      }}
      onMouseLeave={() => {
        if (active !== undefined) return;
        setIsActiveInternal(false);
      }}
      onFocus={() => {
        if (active !== undefined) return;
        measureOverflow();
        setIsActiveInternal(true);
      }}
      onBlur={() => {
        if (active !== undefined) return;
        setIsActiveInternal(false);
      }}
    >
      <span
        ref={viewportRef}
        className={[styles.overflowMarqueeViewport, viewportClassName].filter(Boolean).join(" ")}
      >
        <span
          ref={trackRef}
          className={[styles.overflowMarqueeTrack, trackClassName].filter(Boolean).join(" ")}
          style={{
            transform: `translate3d(${transformX}px, 0, 0)`,
            transitionProperty: transitionMs > 0 ? "transform" : "none",
            transitionDuration: `${transitionMs}ms`,
          }}
        >
          {text}
        </span>
      </span>
    </span>
  );
}
