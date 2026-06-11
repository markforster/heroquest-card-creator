"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "@/api/client";
import styles from "@/app/page.module.css";
import {
  noopRouteShellCapabilities,
  usePublishRouteShellCapabilities,
} from "@/components/App/RouteShellCapabilitiesContext";
import { useEscapeModalAware } from "@/components/common/EscapeStackProvider";
import WelcomeTemplateModal from "@/components/Modals/WelcomeTemplateModal";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useEditorForm } from "@/components/Providers/EditorFormContext";
import { StockpileMainPanel } from "@/components/Stockpile";
import { saveDraft } from "@/lib/draft-storage";
import { createEditorDefaultValues } from "@/lib/editor-form";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

export default function CardsPage() {
  const { track } = useAnalytics();
  const navigate = useNavigate();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
    setActiveCard,
    setSelectedTemplateId,
  } = useCardEditor();
  const { resetWithSaved } = useEditorForm();
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);

  const currentTemplateId = selectedTemplateId ?? null;
  const activeCardId =
    currentTemplateId != null ? activeCardIdByTemplate[currentTemplateId] : undefined;

  usePublishRouteShellCapabilities(noopRouteShellCapabilities);

  useEffect(() => {
    track("page_view", { page_path: "/cards", page_title: "Cards" });
  }, [track]);

  useEscapeModalAware({
    id: "route:cards",
    isOpen: true,
    enabled: true,
    onEscape: () => {
      if (activeCardId) {
        navigate(`/cards/${activeCardId}`);
      }
    },
  });

  useEffect(() => {
    if (!selectedTemplateId) return;
    const currentTemplate = selectedTemplateId as TemplateId;
    if (activeCardIdByTemplate[currentTemplate]) return;

    if (typeof window !== "undefined") {
      const initialLoad = window.sessionStorage.getItem("hqcc.initialLoadCompleted");
      if (initialLoad) {
        return;
      }
      window.sessionStorage.setItem("hqcc.initialLoadCompleted", "1");
    }

    let cancelled = false;

    void (async () => {
      try {
        const cardsResponse = await apiClient.listCards({ queries: { status: "saved" } });
        const cards = Array.isArray(cardsResponse) ? cardsResponse : [];
        if (cancelled) return;
        if (!cards.length) {
          setIsWelcomeOpen(true);
          return;
        }
        cards.sort((a, b) => {
          const aViewed = a.lastViewedAt ?? 0;
          const bViewed = b.lastViewedAt ?? 0;
          if (bViewed !== aViewed) return bViewed - aViewed;
          if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
          const aName = a.nameLower ?? a.name.toLocaleLowerCase();
          const bName = b.nameLower ?? b.name.toLocaleLowerCase();
          return aName.localeCompare(bName);
        });
        const latest = cards[0];
        if (!latest) return;
        navigate(`/cards/${latest.id}`, { replace: true });
      } catch {
        // Ignore failures; app can still run without auto-restore.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeCardIdByTemplate, navigate, selectedTemplateId]);

  return (
    <>
      <section className={`${styles.leftPanel} d-flex align-items-stretch`}>
        <StockpileMainPanel
          isOpen
          onClose={() => {}}
          onLoadCard={(card) => navigate(`/cards/${card.id}`)}
        />
      </section>
      <WelcomeTemplateModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
        onSelect={(templateId) => {
          track("template_selected", {
            template_id: templateId,
            source: "welcome_modal",
          });
          const nextDraft = createEditorDefaultValues(templateId);
          setSelectedTemplateId(templateId);
          saveDraft(templateId, nextDraft, { sourceCardId: null });
          resetWithSaved(nextDraft as CardDataByTemplate[TemplateId]);
          setActiveCard(templateId, null, null);
          navigate("/cards/new", { replace: true });
          setIsWelcomeOpen(false);
        }}
      />
    </>
  );
}
