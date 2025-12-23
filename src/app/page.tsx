"use client";

import { useRef, useState } from "react";

import { AssetHashIndexProvider } from "@/components/Assets/AssetHashIndexProvider";
import { CardEditorProvider, useCardEditor } from "@/components/CardEditor/CardEditorContext";
import CardPreviewContainer from "@/components/CardEditor/CardPreviewContainer";
import CardInspector from "@/components/CardInspector/CardInspector";
import type { CardPreviewHandle } from "@/components/CardPreview";
import EditorActionsToolbar from "@/components/EditorActionsToolbar";
import HeaderWithTemplatePicker from "@/components/HeaderWithTemplatePicker";
import MainFooter from "@/components/MainFooter";
import { cardTemplatesById } from "@/data/card-templates";
import { cardDataToCardRecordPatch } from "@/lib/card-record-mapper";
import { createCard, updateCard } from "@/lib/cards-db";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import styles from "./page.module.css";

function IndexPageInner() {
  const {
    state: { selectedTemplateId, cardDrafts, activeCardIdByTemplate, activeCardStatusByTemplate },
    setActiveCard,
    setTemplateDirty,
  } = useCardEditor();

  const selectedTemplate = selectedTemplateId ? cardTemplatesById[selectedTemplateId] : undefined;
  const previewRef = useRef<CardPreviewHandle>(null!);

  const currentTemplateId = selectedTemplateId ?? null;
  const activeCardId =
    currentTemplateId != null ? activeCardIdByTemplate[currentTemplateId] : undefined;
  const activeStatus =
    currentTemplateId != null ? activeCardStatusByTemplate[currentTemplateId] : undefined;

  const canSaveAsNew = Boolean(currentTemplateId && cardDrafts[currentTemplateId]);
  const canSaveChanges = Boolean(currentTemplateId && activeCardId && activeStatus === "saved");

  const [savingMode, setSavingMode] = useState<"new" | "update" | null>(null);

  const handleSave = async (mode: "new" | "update") => {
    if (!currentTemplateId) return;
    const templateId = currentTemplateId as TemplateId;
    const draft = cardDrafts[templateId] as CardDataByTemplate[TemplateId] | undefined;
    if (!draft) return;

    const startedAt = Date.now();
    setSavingMode(mode);

    let thumbnailBlob: Blob | null = null;
    try {
      const blob = await previewRef.current?.renderToPngBlob({
        width: 225,
        height: 315,
      });
      thumbnailBlob = blob ?? null;
    } catch {
      // eslint-disable-next-line no-console
      console.error("[page] Failed to render thumbnail blob");
    }

    const rawTitle =
      (draft && "title" in draft && (draft as { title?: string | null }).title) || "";
    const derivedName = (rawTitle ?? "").toString().trim() || `${templateId} card`;

    const patch = cardDataToCardRecordPatch(templateId, derivedName, draft as never);

    try {
      if (mode === "new") {
        const record = await createCard({
          ...patch,
          templateId,
          status: "saved",
          thumbnailBlob,
          name: derivedName,
        });
        setActiveCard(templateId, record.id, record.status);
        setTemplateDirty(templateId, false);
      } else if (mode === "update") {
        if (!activeCardId || activeStatus !== "saved") return;
        const record = await updateCard(activeCardId, {
          ...patch,
          thumbnailBlob,
        });
        if (record) {
          setActiveCard(templateId, record.id, record.status);
          setTemplateDirty(templateId, false);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[page] Failed to save card", error);
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 300 - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setSavingMode(null);
    }
  };

  return (
    <div className={styles.page}>
      <HeaderWithTemplatePicker />
      <main className={styles.main}>
        <section className={styles.leftPanel}>
          {/* <div className={styles.templateSidebar}>
            <TemplatesList
              selectedId={selectedTemplateId}
              onSelect={(id) => setSelectedTemplateId(id as TemplateId)}
              variant="sidebar"
            />
          </div> */}
          <div className={styles.previewContainer}>
            {selectedTemplate ? <CardPreviewContainer previewRef={previewRef} /> : null}
          </div>
        </section>
        <aside className={styles.rightPanel}>
          <div className={styles.inspectorBody}>
            <CardInspector />
          </div>
          <EditorActionsToolbar
            canSaveChanges={canSaveChanges}
            canSaveAsNew={canSaveAsNew}
            savingMode={savingMode}
            onExportPng={() => {
              previewRef.current?.exportAsPng();
            }}
            onSaveChanges={() => handleSave("update")}
            onSaveAsNew={() => handleSave("new")}
          />
        </aside>
      </main>
      <MainFooter />
    </div>
  );
}

export default function IndexPage() {
  return (
    <CardEditorProvider>
      <AssetHashIndexProvider>
        <IndexPageInner />
      </AssetHashIndexProvider>
    </CardEditorProvider>
  );
}
