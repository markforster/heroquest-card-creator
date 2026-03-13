"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MonitorDown } from "lucide-react";

import styles from "@/app/page.module.css";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useI18n } from "@/i18n/I18nProvider";

const ENABLE_GET_APP_GLOW = true;
const WAIT_BEFORE_FIRST_MS = 10 * 60 * 1000;
const ACTIVE_PULSE_EVERY_MS = 5 * 1000;
const BURST_ACTIVE_MS = 60 * 1000;
const BURST_IDLE_MS = 3 * 60 * 1000;
const SESSION_CAP_MS = 10 * 60 * 1000;
const SNOOZE_MS = 3 * 60 * 60 * 1000;
const CLICK_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000;
const MAX_COOLDOWN_CYCLES = 3;
const GET_APP_GLOW_STORAGE_KEY = "hqcc.getAppGlow";

type GlowPhase = "waiting" | "active" | "snooze";

type GlowState = {
  phase: GlowPhase;
  phaseStartMs: number;
  lastStartMs: number;
  lastStopMs: number;
  lastPulseMs: number;
  cooldownUntilMs: number;
  cooldownCount: number;
  disabled: boolean;
};

const createDefaultGlowState = (now: number): GlowState => ({
  phase: "waiting",
  phaseStartMs: now,
  lastStartMs: 0,
  lastStopMs: 0,
  lastPulseMs: 0,
  cooldownUntilMs: 0,
  cooldownCount: 0,
  disabled: false,
});

const parseStoredGlowState = (raw: string | null, now: number): GlowState => {
  if (!raw) return createDefaultGlowState(now);
  try {
    const parsed = JSON.parse(raw) as Partial<GlowState> | null;
    if (!parsed || typeof parsed !== "object") return createDefaultGlowState(now);
    const phase = parsed.phase === "active" || parsed.phase === "snooze" ? parsed.phase : "waiting";
    return {
      phase,
      phaseStartMs: Number.isFinite(parsed.phaseStartMs ?? NaN)
        ? (parsed.phaseStartMs as number)
        : now,
      lastStartMs: Number.isFinite(parsed.lastStartMs ?? NaN) ? (parsed.lastStartMs as number) : 0,
      lastStopMs: Number.isFinite(parsed.lastStopMs ?? NaN) ? (parsed.lastStopMs as number) : 0,
      lastPulseMs: Number.isFinite(parsed.lastPulseMs ?? NaN) ? (parsed.lastPulseMs as number) : 0,
      cooldownUntilMs: Number.isFinite(parsed.cooldownUntilMs ?? NaN)
        ? (parsed.cooldownUntilMs as number)
        : 0,
      cooldownCount: Number.isFinite(parsed.cooldownCount ?? NaN)
        ? (parsed.cooldownCount as number)
        : 0,
      disabled: parsed.disabled === true,
    };
  } catch {
    return createDefaultGlowState(now);
  }
};

const persistGlowState = (state: GlowState) => {
  try {
    window.localStorage.setItem(GET_APP_GLOW_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors.
  }
};

export default function LeftNavDownloadAction() {
  const { t } = useI18n();
  const { track } = useAnalytics();
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const [isLocalInstall, setIsLocalInstall] = useState(false);
  const [isGlowActive, setIsGlowActive] = useState(false);
  const glowStateRef = useRef<GlowState | null>(null);
  const timersRef = useRef<number[]>([]);
  const scheduleRef = useRef<((state: GlowState) => void) | null>(null);

  const distribution = process.env.NEXT_PUBLIC_APP_DISTRIBUTION ?? "unknown";
  const isEligibleBuild =
    distribution === "itch" ||
    distribution === "self_hosted" ||
    distribution === "unknown" ||
    distribution === "npm" ||
    distribution === "download";

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsLocalInstall(window.location.protocol === "file:");
  }, []);

  useEffect(() => {
    if (!isEligibleBuild) return;
    const link = linkRef.current;
    if (!link || typeof window === "undefined") return;
    const itch = (
      window as typeof window & {
        Itch?: {
          attachBuyButton?: (
            el: HTMLElement,
            opts: { user: string; game: string; width?: number; height?: number },
          ) => void;
        };
      }
    ).Itch;
    if (!itch?.attachBuyButton) return;
    itch.attachBuyButton(link, {
      user: "mark-forster",
      game: "heroquest-card-creator",
      width: 650,
      height: 400,
    });
  }, [isEligibleBuild]);

  const label = useMemo(() => {
    if (distribution === "download" || isLocalInstall) {
      return t("actions.checkForUpdates");
    }
    return t("actions.getTheApp");
  }, [distribution, isLocalInstall, t]);

  useEffect(() => {
    if (!isEligibleBuild) {
      setIsGlowActive(false);
      return;
    }
    if (!ENABLE_GET_APP_GLOW) {
      setIsGlowActive(false);
      return;
    }
    if (typeof window === "undefined") return;

    const clearTimers = () => {
      timersRef.current.forEach((id) => {
        window.clearTimeout(id);
        window.clearInterval(id);
      });
      timersRef.current = [];
    };

    const setTimer = (cb: () => void, delay: number) => {
      const id = window.setTimeout(cb, delay);
      timersRef.current.push(id);
    };

    const scheduleFromState = (state: GlowState) => {
      clearTimers();

      if (state.disabled) {
        setIsGlowActive(false);
        return;
      }

      const now = Date.now();
      if (state.cooldownCount >= MAX_COOLDOWN_CYCLES && state.cooldownUntilMs <= now) {
        const disabledState = { ...state, disabled: true, cooldownUntilMs: 0 };
        glowStateRef.current = disabledState;
        persistGlowState(disabledState);
        setIsGlowActive(false);
        return;
      }
      if (state.cooldownUntilMs > now) {
        setIsGlowActive(false);
        setTimer(() => {
          if (state.cooldownCount >= MAX_COOLDOWN_CYCLES) {
            const disabledState = { ...state, disabled: true, cooldownUntilMs: 0 };
            glowStateRef.current = disabledState;
            persistGlowState(disabledState);
            setIsGlowActive(false);
            return;
          }
          const resumed = {
            ...state,
            cooldownUntilMs: 0,
            phase: "waiting" as GlowPhase,
            phaseStartMs: state.cooldownUntilMs,
          };
          glowStateRef.current = resumed;
          persistGlowState(resumed);
          scheduleFromState(resumed);
        }, state.cooldownUntilMs - now);
        return;
      }

      if (state.phase === "waiting") {
        const activeStart = state.phaseStartMs + WAIT_BEFORE_FIRST_MS;
        if (now >= activeStart) {
          const cycleElapsed = now - activeStart;
          const cycleLength = SESSION_CAP_MS + SNOOZE_MS;
          const cycleOffset = cycleElapsed % cycleLength;
          if (cycleOffset < SESSION_CAP_MS) {
            const activeState = {
              ...state,
              phase: "active" as GlowPhase,
              phaseStartMs: now - cycleOffset,
              lastStartMs: now - cycleOffset,
              lastPulseMs: now - cycleOffset,
            };
            glowStateRef.current = activeState;
            persistGlowState(activeState);
            scheduleFromState(activeState);
            return;
          }
          const snoozeOffset = cycleOffset - SESSION_CAP_MS;
          const snoozeState = {
            ...state,
            phase: "snooze" as GlowPhase,
            phaseStartMs: now - snoozeOffset,
            lastStopMs: now - snoozeOffset,
          };
          glowStateRef.current = snoozeState;
          persistGlowState(snoozeState);
          scheduleFromState(snoozeState);
          return;
        }
        setIsGlowActive(false);
        setTimer(() => {
          const activeState = {
            ...state,
            phase: "active" as GlowPhase,
            phaseStartMs: activeStart,
            lastStartMs: activeStart,
            lastPulseMs: activeStart,
          };
          glowStateRef.current = activeState;
          persistGlowState(activeState);
          scheduleFromState(activeState);
        }, activeStart - now);
        return;
      }

      if (state.phase === "active") {
        const activeStart = state.phaseStartMs;
        const activeEnd = activeStart + SESSION_CAP_MS;
        if (now >= activeEnd) {
          const snoozeState = {
            ...state,
            phase: "snooze" as GlowPhase,
            phaseStartMs: activeEnd,
            lastStopMs: activeEnd,
          };
          glowStateRef.current = snoozeState;
          persistGlowState(snoozeState);
          scheduleFromState(snoozeState);
          return;
        }

        const burstCycle = BURST_ACTIVE_MS + BURST_IDLE_MS;
        const elapsed = Math.max(0, now - activeStart);
        const cycleOffset = elapsed % burstCycle;

        if (cycleOffset >= BURST_ACTIVE_MS) {
          setIsGlowActive(false);
          const nextBurstStart = now + (burstCycle - cycleOffset);
          const nextEventAt = Math.min(nextBurstStart, activeEnd);
          setTimer(() => {
            const current = glowStateRef.current;
            if (current) scheduleFromState(current);
          }, Math.max(0, nextEventAt - now));
        } else {
          const pulseIndex = Math.floor(cycleOffset / ACTIVE_PULSE_EVERY_MS);
          const isOn = pulseIndex % 2 === 0;
          setIsGlowActive(isOn);

          const burstStart = now - cycleOffset;
          const burstEnd = burstStart + BURST_ACTIVE_MS;
          const nextPulseAt = burstStart + (pulseIndex + 1) * ACTIVE_PULSE_EVERY_MS;
          const nextEventAt = Math.min(nextPulseAt, burstEnd, activeEnd);

          setTimer(() => {
            const current = glowStateRef.current;
            if (current) scheduleFromState(current);
          }, Math.max(0, nextEventAt - now));
        }
        setTimer(() => {
          const snoozeState = {
            ...state,
            phase: "snooze" as GlowPhase,
            phaseStartMs: activeEnd,
            lastStopMs: activeEnd,
          };
          glowStateRef.current = snoozeState;
          persistGlowState(snoozeState);
          scheduleFromState(snoozeState);
        }, activeEnd - now);
        return;
      }

      if (state.phase === "snooze") {
        setIsGlowActive(false);
        const nextActive = state.phaseStartMs + SNOOZE_MS;
        if (now >= nextActive) {
          const activeState = {
            ...state,
            phase: "active" as GlowPhase,
            phaseStartMs: nextActive,
            lastStartMs: nextActive,
            lastPulseMs: nextActive,
          };
          glowStateRef.current = activeState;
          persistGlowState(activeState);
          scheduleFromState(activeState);
          return;
        }
        setTimer(() => {
          const activeState = {
            ...state,
            phase: "active" as GlowPhase,
            phaseStartMs: nextActive,
            lastStartMs: nextActive,
            lastPulseMs: nextActive,
          };
          glowStateRef.current = activeState;
          persistGlowState(activeState);
          scheduleFromState(activeState);
        }, nextActive - now);
      }
    };

    const now = Date.now();
    const stored = parseStoredGlowState(window.localStorage.getItem(GET_APP_GLOW_STORAGE_KEY), now);
    glowStateRef.current = stored;
    persistGlowState(stored);
    scheduleFromState(stored);
    scheduleRef.current = scheduleFromState;

    return () => {
      clearTimers();
    };
  }, [isEligibleBuild]);

  if (!isEligibleBuild) {
    return null;
  }

  return (
    <a
      ref={linkRef}
      href="#"
      className={`${styles.leftNavItem} ${ENABLE_GET_APP_GLOW ? styles.leftNavItemGlow : ""} ${
        isGlowActive ? styles.leftNavItemGlowActive : ""
      } d-flex align-items-center gap-2`}
      onClickCapture={(event) => {
        event.preventDefault();
        track("page_view", { page_path: "/download", page_title: "Download" });
        if (ENABLE_GET_APP_GLOW && typeof window !== "undefined") {
          const now = Date.now();
          const current = glowStateRef.current ?? createDefaultGlowState(now);
          const nextCooldownCount = current.cooldownCount + 1;
          const updated: GlowState = {
            ...current,
            cooldownUntilMs: now + CLICK_COOLDOWN_MS,
            cooldownCount: nextCooldownCount,
            phase: "waiting",
            phaseStartMs: now,
          };
          glowStateRef.current = updated;
          setIsGlowActive(false);
          persistGlowState(updated);
          scheduleRef.current?.(updated);
        }
      }}
      aria-label={label}
      title={label}
    >
      <span className={styles.leftNavGlyph} aria-hidden="true">
        <MonitorDown />
      </span>
      <span className={styles.leftNavLabel}>{label}</span>
    </a>
  );
}
