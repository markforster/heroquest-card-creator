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

import type { MouseEvent, ReactNode, RefObject } from "react";

export const EDITOR_TARGET_IDS = {
  title: "title",
  imageMain: "image.main",
  imageIcon: "image.icon",
  textMain: "text.main",
  statsHero: "stats.hero",
  statsMonster: "stats.monster",
  copyright: "copyright",
} as const;

export type EditorTargetId = (typeof EDITOR_TARGET_IDS)[keyof typeof EDITOR_TARGET_IDS];
type FocusRequest = { targetId: EditorTargetId; requestId: number };
type FocusTargetHandler = () => void;

type EditorTargetsContextValue = {
  requestedFocusTargetId: EditorTargetId | null;
  selectedTargetId: EditorTargetId | null;
  setSelectedTargetId: (targetId: EditorTargetId | null) => void;
  registerFocusTarget: (targetId: EditorTargetId, handler: FocusTargetHandler) => () => void;
  requestFocusTarget: (targetId: EditorTargetId) => void;
};

const EditorTargetsContext = createContext<EditorTargetsContextValue | null>(null);

export function EditorTargetsProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef(new Map<EditorTargetId, FocusTargetHandler>());
  const handledRequestIdRef = useRef<number | null>(null);
  const nextRequestIdRef = useRef(1);
  const [selectedTargetId, setSelectedTargetId] = useState<EditorTargetId | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [registryVersion, setRegistryVersion] = useState(0);

  const registerFocusTarget = useCallback(
    (targetId: EditorTargetId, handler: FocusTargetHandler) => {
      handlersRef.current.set(targetId, handler);
      setRegistryVersion((version) => version + 1);
      return () => {
        if (handlersRef.current.get(targetId) === handler) {
          handlersRef.current.delete(targetId);
          setRegistryVersion((version) => version + 1);
        }
      };
    },
    [],
  );

  const requestFocusTarget = useCallback((targetId: EditorTargetId) => {
    setSelectedTargetId(targetId);
    setFocusRequest({
      targetId,
      requestId: nextRequestIdRef.current++,
    });
  }, []);

  useEffect(() => {
    if (!focusRequest) return;

    const handler = handlersRef.current.get(focusRequest.targetId);
    if (!handler) return;
    if (handledRequestIdRef.current === focusRequest.requestId) return;

    handledRequestIdRef.current = focusRequest.requestId;
    handler();
    setFocusRequest((current) =>
      current?.requestId === focusRequest.requestId ? null : current,
    );
  }, [focusRequest, registryVersion]);

  const value = useMemo<EditorTargetsContextValue>(
    () => ({
      requestedFocusTargetId: focusRequest?.targetId ?? null,
      selectedTargetId,
      setSelectedTargetId,
      registerFocusTarget,
      requestFocusTarget,
    }),
    [focusRequest?.targetId, registerFocusTarget, requestFocusTarget, selectedTargetId],
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

  useEffect(() => {
    return registerFocusTarget(targetId, () => {
      const container = containerRef.current;
      if (!container) return;

      if (typeof container.scrollIntoView === "function") {
        container.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
      }
      const focusTarget =
        focusRef?.current ??
        focusSelectors
          .map((selector) => container.querySelector<HTMLElement>(selector))
          .find((candidate): candidate is HTMLElement => candidate != null) ??
        undefined;

      focusTarget?.focus();
      setSelectedTargetId(targetId);
    });
  }, [
    containerRef,
    focusRef,
    focusSelectors,
    registerFocusTarget,
    setSelectedTargetId,
    targetId,
  ]);

  return useCallback(() => {
    setSelectedTargetId(targetId);
  }, [setSelectedTargetId, targetId]);
}

export function useSvgFocusTarget(targetId: EditorTargetId) {
  const { requestFocusTarget } = useEditorTargets();

  return useMemo(
    () => ({
      "data-hqcc-edit": targetId,
      onClick: (event: MouseEvent<SVGGElement | SVGImageElement | SVGPathElement>) => {
        event.stopPropagation();
        requestFocusTarget(targetId);
      },
      style: { cursor: "pointer" },
    }),
    [requestFocusTarget, targetId],
  );
}
