"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { MouseEvent, PointerEvent, ReactNode, RefObject } from "react";
import { ENABLE_EDITOR_TARGET_INTERACTIONS } from "@/config/flags";
import type { BlueprintBounds } from "@/types/blueprints";

export const EDITOR_TARGET_IDS = {
  title: "title",
  imageMain: "image.main",
  imageIcon: "image.icon",
  textMain: "text.main",
  statsHero: "stats.hero",
  statsHeroAttackDice: "stats.hero.attackDice",
  statsHeroDefendDice: "stats.hero.defendDice",
  statsHeroBodyPoints: "stats.hero.bodyPoints",
  statsHeroMindPoints: "stats.hero.mindPoints",
  statsMonster: "stats.monster",
  statsMonsterMovementSquares: "stats.monster.movementSquares",
  statsMonsterAttackDice: "stats.monster.attackDice",
  statsMonsterDefendDice: "stats.monster.defendDice",
  statsMonsterBodyPoints: "stats.monster.bodyPoints",
  statsMonsterMindPoints: "stats.monster.mindPoints",
  copyright: "copyright",
} as const;

export type EditorTargetId = (typeof EDITOR_TARGET_IDS)[keyof typeof EDITOR_TARGET_IDS];
export const HERO_STAT_TARGET_IDS = {
  attackDice: EDITOR_TARGET_IDS.statsHeroAttackDice,
  defendDice: EDITOR_TARGET_IDS.statsHeroDefendDice,
  bodyPoints: EDITOR_TARGET_IDS.statsHeroBodyPoints,
  mindPoints: EDITOR_TARGET_IDS.statsHeroMindPoints,
} as const;
export const MONSTER_STAT_TARGET_IDS = {
  movementSquares: EDITOR_TARGET_IDS.statsMonsterMovementSquares,
  attackDice: EDITOR_TARGET_IDS.statsMonsterAttackDice,
  defendDice: EDITOR_TARGET_IDS.statsMonsterDefendDice,
  bodyPoints: EDITOR_TARGET_IDS.statsMonsterBodyPoints,
  mindPoints: EDITOR_TARGET_IDS.statsMonsterMindPoints,
} as const;
export type EditorTargetActionIntent = "focus" | "reveal";
type TargetActionRequest = {
  targetId: EditorTargetId;
  intent: EditorTargetActionIntent;
  requestId: number;
};
type FocusTargetHandler = (intent: EditorTargetActionIntent) => void;
export type HoverAdornmentTone = "primary" | "secondary" | "active";
export type HoverAdornmentShape =
  | ({
      kind: "rect";
      radius?: number;
      tone?: HoverAdornmentTone;
    } & BlueprintBounds)
  | {
      kind: "path";
      d: string;
      tone?: HoverAdornmentTone;
    };
export type HoverAdornmentDescriptor =
  | HoverAdornmentShape
  | {
      kind: "group";
      items: HoverAdornmentShape[];
    };

const HOVER_CLEAR_DELAY_MS = 50;
const HOVER_REVEAL_DELAY_MS = 3000;
const INSPECTOR_REVEAL_MARGIN_PX = 8;

type EditorTargetsContextValue = {
  requestedTargetAction: TargetActionRequest | null;
  hoveredTargetId: EditorTargetId | null;
  selectedTargetId: EditorTargetId | null;
  hoverAdornmentDescriptor: HoverAdornmentDescriptor | null;
  beginHoverTarget: (targetId: EditorTargetId) => void;
  endHoverTarget: (targetId: EditorTargetId) => void;
  setHoveredTargetId: (targetId: EditorTargetId | null) => void;
  setSelectedTargetId: (targetId: EditorTargetId | null) => void;
  registerFocusTarget: (targetId: EditorTargetId, handler: FocusTargetHandler) => () => void;
  registerHoverAdornment: (
    targetId: EditorTargetId,
    descriptor: HoverAdornmentDescriptor,
  ) => () => void;
  requestRevealTarget: (targetId: EditorTargetId) => void;
  requestFocusTarget: (targetId: EditorTargetId) => void;
};

const EditorTargetsContext = createContext<EditorTargetsContextValue | null>(null);

export function EditorTargetsProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef(new Map<EditorTargetId, FocusTargetHandler>());
  const hoverAdornmentsRef = useRef(new Map<EditorTargetId, HoverAdornmentDescriptor>());
  const actionRequestRef = useRef<TargetActionRequest | null>(null);
  const handledRequestIdRef = useRef<number | null>(null);
  const hoveredTargetIdRef = useRef<EditorTargetId | null>(null);
  const hoverClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverRevealTargetIdRef = useRef<EditorTargetId | null>(null);
  const nextRequestIdRef = useRef(1);
  const [hoveredTargetId, setHoveredTargetId] = useState<EditorTargetId | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<EditorTargetId | null>(null);
  const [actionRequest, setActionRequest] = useState<TargetActionRequest | null>(null);
  const [hoverRegistryVersion, setHoverRegistryVersion] = useState(0);

  const tryHandleActionRequest = useCallback((request: TargetActionRequest | null) => {
    if (!request) return;

    const handler = handlersRef.current.get(request.targetId);
    if (!handler) return;
    if (handledRequestIdRef.current === request.requestId) return;

    handledRequestIdRef.current = request.requestId;
    handler(request.intent);
    setActionRequest((current) =>
      current?.requestId === request.requestId ? null : current,
    );
  }, []);

  const registerFocusTarget = useCallback(
    (targetId: EditorTargetId, handler: FocusTargetHandler) => {
      if (!ENABLE_EDITOR_TARGET_INTERACTIONS) {
        return () => {};
      }
      handlersRef.current.set(targetId, handler);
      const pendingRequest = actionRequestRef.current;
      if (pendingRequest?.targetId === targetId) {
        tryHandleActionRequest(pendingRequest);
      }
      return () => {
        if (handlersRef.current.get(targetId) === handler) {
          handlersRef.current.delete(targetId);
        }
      };
    },
    [tryHandleActionRequest],
  );

  const requestTargetAction = useCallback(
    (targetId: EditorTargetId, intent: EditorTargetActionIntent) => {
      if (!ENABLE_EDITOR_TARGET_INTERACTIONS) return;
      if (intent === "focus") {
        setSelectedTargetId(targetId);
      }
      setActionRequest({
        targetId,
        intent,
        requestId: nextRequestIdRef.current++,
      });
    },
    [],
  );

  const requestFocusTarget = useCallback((targetId: EditorTargetId) => {
    requestTargetAction(targetId, "focus");
  }, [requestTargetAction]);

  const requestRevealTarget = useCallback((targetId: EditorTargetId) => {
    requestTargetAction(targetId, "reveal");
  }, [requestTargetAction]);

  const clearPendingHoverRevealTimeout = useCallback(() => {
    if (!hoverRevealTimeoutRef.current) return;
    clearTimeout(hoverRevealTimeoutRef.current);
    hoverRevealTimeoutRef.current = null;
    hoverRevealTargetIdRef.current = null;
  }, []);

  const scheduleHoverReveal = useCallback((targetId: EditorTargetId) => {
    if (!ENABLE_EDITOR_TARGET_INTERACTIONS) return;
    clearPendingHoverRevealTimeout();
    hoverRevealTargetIdRef.current = targetId;
    hoverRevealTimeoutRef.current = setTimeout(() => {
      hoverRevealTimeoutRef.current = null;
      hoverRevealTargetIdRef.current = null;
      if (hoveredTargetIdRef.current !== targetId) return;
      requestTargetAction(targetId, "reveal");
    }, HOVER_REVEAL_DELAY_MS);
  }, [clearPendingHoverRevealTimeout, requestTargetAction]);

  const clearPendingHoverTimeout = useCallback(() => {
    if (!hoverClearTimeoutRef.current) return;
    clearTimeout(hoverClearTimeoutRef.current);
    hoverClearTimeoutRef.current = null;
  }, []);

  const commitHoveredTarget = useCallback(
    (targetId: EditorTargetId | null) => {
      hoveredTargetIdRef.current = targetId;
      setHoveredTargetId(targetId);
    },
    [],
  );

  const beginHoverTarget = useCallback(
    (targetId: EditorTargetId) => {
      if (!ENABLE_EDITOR_TARGET_INTERACTIONS) return;
      clearPendingHoverTimeout();
      scheduleHoverReveal(targetId);
      if (hoveredTargetIdRef.current === targetId) return;
      commitHoveredTarget(targetId);
    },
    [clearPendingHoverTimeout, commitHoveredTarget, scheduleHoverReveal],
  );

  const endHoverTarget = useCallback(
    (targetId: EditorTargetId) => {
      if (!ENABLE_EDITOR_TARGET_INTERACTIONS) return;
      if (hoverRevealTargetIdRef.current === targetId) {
        clearPendingHoverRevealTimeout();
      }
      if (hoveredTargetIdRef.current !== targetId) return;
      clearPendingHoverTimeout();
      hoverClearTimeoutRef.current = setTimeout(() => {
        hoverClearTimeoutRef.current = null;
        if (hoveredTargetIdRef.current === targetId) {
          commitHoveredTarget(null);
        }
      }, HOVER_CLEAR_DELAY_MS);
    },
    [clearPendingHoverRevealTimeout, clearPendingHoverTimeout, commitHoveredTarget],
  );

  const registerHoverAdornment = useCallback(
    (targetId: EditorTargetId, descriptor: HoverAdornmentDescriptor) => {
      if (!ENABLE_EDITOR_TARGET_INTERACTIONS) {
        return () => {};
      }
      hoverAdornmentsRef.current.set(targetId, descriptor);
      setHoverRegistryVersion((version) => version + 1);
      return () => {
        if (hoverAdornmentsRef.current.get(targetId) === descriptor) {
          hoverAdornmentsRef.current.delete(targetId);
          setHoverRegistryVersion((version) => version + 1);
        }
      };
    },
    [],
  );

  useEffect(() => {
    actionRequestRef.current = actionRequest;
  }, [actionRequest]);

  useEffect(() => {
    hoveredTargetIdRef.current = hoveredTargetId;
  }, [hoveredTargetId]);

  useEffect(() => {
    tryHandleActionRequest(actionRequest);
  }, [actionRequest, tryHandleActionRequest]);

  useEffect(() => {
    return () => {
      clearPendingHoverTimeout();
      clearPendingHoverRevealTimeout();
    };
  }, [clearPendingHoverRevealTimeout, clearPendingHoverTimeout]);

  const value = useMemo<EditorTargetsContextValue>(
    () => ({
      requestedTargetAction: actionRequest,
      hoveredTargetId,
      selectedTargetId,
      hoverAdornmentDescriptor:
        hoveredTargetId != null ? (hoverAdornmentsRef.current.get(hoveredTargetId) ?? null) : null,
      beginHoverTarget,
      endHoverTarget,
      setHoveredTargetId,
      setSelectedTargetId,
      registerFocusTarget,
      registerHoverAdornment,
      requestRevealTarget,
      requestFocusTarget,
    }),
    [
      actionRequest,
      beginHoverTarget,
      endHoverTarget,
      hoveredTargetId,
      hoverRegistryVersion,
      registerHoverAdornment,
      registerFocusTarget,
      requestRevealTarget,
      requestFocusTarget,
      selectedTargetId,
    ],
  );

  return (
    <EditorTargetsContext.Provider value={value}>{children}</EditorTargetsContext.Provider>
  );
}

export function useEditorTargets() {
  const context = useContext(EditorTargetsContext);
  if (!context) {
    throw new Error("useEditorTargets must be used within an EditorTargetsProvider");
  }
  return context;
}

export function useOptionalEditorTargets() {
  return useContext(EditorTargetsContext);
}

export function useIsEditorTargetHovered(targetId: EditorTargetId) {
  const editorTargets = useOptionalEditorTargets();
  return editorTargets?.hoveredTargetId === targetId;
}

function clampScrollTop(value: number, scrollContainer: HTMLElement) {
  const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
  return Math.min(Math.max(0, value), maxScrollTop);
}

function revealInspectorComponent(container: HTMLElement) {
  const scrollContainer = container.closest<HTMLElement>(
    '[data-hqcc-inspector-scroll-container="true"]',
  );

  if (!scrollContainer) {
    if (typeof container.scrollIntoView === "function") {
      container.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const scrollRect = scrollContainer.getBoundingClientRect();
  const revealHeight = scrollRect.height - INSPECTOR_REVEAL_MARGIN_PX * 2;
  const topDelta = containerRect.top - scrollRect.top - INSPECTOR_REVEAL_MARGIN_PX;
  const bottomDelta = containerRect.bottom - scrollRect.bottom + INSPECTOR_REVEAL_MARGIN_PX;

  let nextScrollTop = scrollContainer.scrollTop;

  if (containerRect.height > revealHeight) {
    if (topDelta !== 0) {
      nextScrollTop += topDelta;
    }
  } else if (topDelta < 0) {
    nextScrollTop += topDelta;
  } else if (bottomDelta > 0) {
    nextScrollTop += bottomDelta;
  }

  const clampedScrollTop = clampScrollTop(nextScrollTop, scrollContainer);
  if (clampedScrollTop === scrollContainer.scrollTop) return;

  if (typeof scrollContainer.scrollTo === "function") {
    scrollContainer.scrollTo({ top: clampedScrollTop, behavior: "smooth" });
    return;
  }

  scrollContainer.scrollTop = clampedScrollTop;
}

type InspectorTargetRegistrationOptions = {
  targetId: EditorTargetId;
  containerRef: RefObject<HTMLElement | null>;
  focusRef?: RefObject<HTMLElement | null>;
  focusSelector?: string;
  focusSelectors?: string[];
};

const DEFAULT_FOCUS_SELECTORS = [
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "button:not([disabled])",
];

export function useInspectorTargetRegistration({
  targetId,
  containerRef,
  focusRef,
  focusSelector,
  focusSelectors = focusSelector ? [focusSelector] : DEFAULT_FOCUS_SELECTORS,
}: InspectorTargetRegistrationOptions) {
  const { registerFocusTarget, setSelectedTargetId } = useEditorTargets();
  const latestFocusSelectorsRef = useRef(focusSelectors);

  useEffect(() => {
    latestFocusSelectorsRef.current = focusSelectors;
  }, [focusSelectors]);

  useEffect(() => {
    if (!ENABLE_EDITOR_TARGET_INTERACTIONS) return;
    return registerFocusTarget(targetId, (intent) => {
      const container = containerRef.current;
      if (!container) return;

      revealInspectorComponent(container);
      if (intent !== "focus") return;

      const focusTarget =
        focusRef?.current ??
        latestFocusSelectorsRef.current
          .map((selector) => container.querySelector<HTMLElement>(selector))
          .find((candidate): candidate is HTMLElement => candidate != null) ??
        undefined;

      focusTarget?.focus({ preventScroll: true });
      setSelectedTargetId(targetId);
    });
  }, [containerRef, focusRef, registerFocusTarget, setSelectedTargetId, targetId]);

  return useCallback(() => {
    if (!ENABLE_EDITOR_TARGET_INTERACTIONS) return;
    setSelectedTargetId(targetId);
  }, [setSelectedTargetId, targetId]);
}

export function useSvgFocusTarget(targetId: EditorTargetId) {
  const editorTargets = useOptionalEditorTargets();

  return useMemo(
    () =>
      ENABLE_EDITOR_TARGET_INTERACTIONS && editorTargets
        ? {
            "data-hqcc-edit": targetId,
            onClick: (event: MouseEvent<SVGElement>) => {
              event.stopPropagation();
              editorTargets.requestFocusTarget(targetId);
            },
            onPointerEnter: (_event: PointerEvent<SVGElement>) => {
              editorTargets.beginHoverTarget(targetId);
            },
            onPointerLeave: (_event: PointerEvent<SVGElement>) => {
              editorTargets.endHoverTarget(targetId);
            },
            style: { cursor: "pointer" },
          }
        : {},
    [editorTargets, targetId],
  );
}

export function useRegisterHoverAdornment(
  targetId: EditorTargetId,
  descriptor: HoverAdornmentDescriptor | null,
) {
  const editorTargets = useOptionalEditorTargets();
  const registerHoverAdornment = editorTargets?.registerHoverAdornment;
  const descriptorKey = useMemo(
    () => (descriptor ? JSON.stringify(descriptor) : null),
    [descriptor],
  );
  const stableDescriptor = useMemo(() => descriptor, [descriptorKey]);

  useEffect(() => {
    if (!ENABLE_EDITOR_TARGET_INTERACTIONS) return;
    if (!registerHoverAdornment) return;
    if (!stableDescriptor) return;
    return registerHoverAdornment(targetId, stableDescriptor);
  }, [descriptorKey, registerHoverAdornment, stableDescriptor, targetId]);
}

export function useRegisterHoverAdornments(
  entries: Array<{ targetId: EditorTargetId; descriptor: HoverAdornmentDescriptor | null }>,
) {
  const editorTargets = useOptionalEditorTargets();
  const registerHoverAdornment = editorTargets?.registerHoverAdornment;
  const descriptorKey = useMemo(
    () =>
      JSON.stringify(
        entries.map((entry) => ({
          targetId: entry.targetId,
          descriptor: entry.descriptor,
        })),
      ),
    [entries],
  );
  const stableEntries = useMemo(() => entries, [descriptorKey]);

  useEffect(() => {
    if (!ENABLE_EDITOR_TARGET_INTERACTIONS) return;
    if (!registerHoverAdornment) return;

    const cleanups = stableEntries
      .filter(
        (
          entry,
        ): entry is { targetId: EditorTargetId; descriptor: HoverAdornmentDescriptor } =>
          entry.descriptor != null,
      )
      .map((entry) => registerHoverAdornment(entry.targetId, entry.descriptor));

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [descriptorKey, registerHoverAdornment, stableEntries]);
}
