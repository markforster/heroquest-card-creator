import { cardTemplatesById } from "@/data/card-templates";
import { applyInspectorDefaults } from "@/lib/editor-form";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

const DRAFT_KEY = "hqcc.draft.v1";
const DRAFT_TEMPLATE_KEY = "hqcc.draftTemplateId.v1";
const DRAFT_SOURCE_KEY = "hqcc.draftSourceCardId.v1";
const LEGACY_DRAFTS_KEY = "hqcc.cardDrafts.v1";

type StoredDraft = {
  templateId: TemplateId;
  data: CardDataByTemplate[TemplateId];
  sourceCardId?: string | null;
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeDraft(templateId: TemplateId, data: unknown): StoredDraft | null {
  if (!data || typeof data !== "object") return null;
  const applied = applyInspectorDefaults(templateId, data as CardDataByTemplate[TemplateId]);
  return { templateId, data: applied };
}

function migrateLegacyDrafts(): StoredDraft | null {
  if (typeof window === "undefined") return null;
  const legacyRaw = window.localStorage.getItem(LEGACY_DRAFTS_KEY);
  const legacy = safeParse<Record<string, unknown>>(legacyRaw);
  if (!legacy || typeof legacy !== "object") return null;

  const preferredTemplate = window.localStorage.getItem("hqcc.selectedTemplateId") as
    | TemplateId
    | null;
  const candidates = Object.keys(legacy).filter(
    (key): key is TemplateId => Boolean(cardTemplatesById[key as TemplateId]),
  );
  if (candidates.length === 0) return null;

  const picked =
    (preferredTemplate && candidates.includes(preferredTemplate) && preferredTemplate) ||
    candidates[0];
  const next = normalizeDraft(picked, legacy[picked]);
  if (!next) return null;

  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next.data));
    window.localStorage.setItem(DRAFT_TEMPLATE_KEY, next.templateId);
    window.localStorage.removeItem(DRAFT_SOURCE_KEY);
    window.localStorage.removeItem(LEGACY_DRAFTS_KEY);
  } catch {
    // Ignore migration storage errors.
  }

  return next;
}

export function loadDraft(): StoredDraft | null {
  if (typeof window === "undefined") return null;
  const storedTemplateId = window.localStorage.getItem(DRAFT_TEMPLATE_KEY) as TemplateId | null;
  const raw = window.localStorage.getItem(DRAFT_KEY);

  if (storedTemplateId && cardTemplatesById[storedTemplateId]) {
    const parsed = safeParse<unknown>(raw);
    const next = normalizeDraft(storedTemplateId, parsed);
    if (next) {
      const source = window.localStorage.getItem(DRAFT_SOURCE_KEY);
      return {
        ...next,
        sourceCardId: source && source.trim().length > 0 ? source : null,
      };
    }
  }

  return migrateLegacyDrafts();
}

export function saveDraft<T extends TemplateId>(
  templateId: T,
  data: CardDataByTemplate[T],
  options?: { sourceCardId?: string | null },
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    window.localStorage.setItem(DRAFT_TEMPLATE_KEY, templateId);
    if (options && "sourceCardId" in options) {
      if (options.sourceCardId) {
        window.localStorage.setItem(DRAFT_SOURCE_KEY, options.sourceCardId);
      } else {
        window.localStorage.removeItem(DRAFT_SOURCE_KEY);
      }
    }
  } catch {
    // Ignore localStorage errors.
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.removeItem(DRAFT_TEMPLATE_KEY);
    window.localStorage.removeItem(DRAFT_SOURCE_KEY);
  } catch {
    // Ignore localStorage errors.
  }
}
