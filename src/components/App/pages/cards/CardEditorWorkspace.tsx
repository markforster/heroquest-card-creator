"use client";

import { useEffect, useState } from "react";

import blueprintFallback from "@/assets/blueprint.png";
import styles from "@/app/page.module.css";
import CardPreviewContainer from "@/components/Cards/CardEditor/CardPreviewContainer";
import { EditorTargetsProvider } from "@/components/Cards/CardEditor/EditorTargetsContext";
import CardInspector from "@/components/Cards/CardInspector/CardInspector";
import InspectorStateNotice from "@/components/Cards/CardInspector/InspectorStateNotice";
import TemplateChooser from "@/components/Cards/CardInspector/TemplateChooser";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview";
import { CARD_HEIGHT, CARD_WIDTH } from "@/components/Cards/CardPreview/consts";
import EditorActionsToolbar from "@/components/EditorActionsToolbar";
import { PreviewCanvasProvider } from "@/components/Providers/PreviewCanvasContext";
import ToolsToolbar from "@/components/ToolsToolbar";
import { useI18n } from "@/i18n/I18nProvider";
import type { TemplateId } from "@/types/templates";

import previewStyles from "@/components/Cards/CardPreview/CardPreview.module.css";

type CardEditorWorkspaceProps = {
  activeFrontId: string | null;
  canDuplicate: boolean;
  canSaveChanges: boolean;
  draftSourceCardId: string | null;
  exportMenuItems: Array<{ id: string; label: string; onClick: () => void }>;
  frontViewToken: number;
  isRouteLoadingCard: boolean;
  onBackToCards: () => void;
  onDuplicate: () => void;
  onDuplicateWithPairing: () => void;
  onExportPng: () => void;
  onRememberBackId: (cardId: string | null) => void;
  onSaveChanges: () => void;
  preferredBackId: string | null;
  previewRef: React.RefObject<CardPreviewHandle>;
  routeError: "not-found" | "load-failed" | null;
  savingMode: "new" | "update" | null;
  selectedTemplateId?: TemplateId;
};

export default function CardEditorWorkspace({
  activeFrontId,
  canDuplicate,
  canSaveChanges,
  draftSourceCardId,
  exportMenuItems,
  frontViewToken,
  isRouteLoadingCard,
  onBackToCards,
  onDuplicate,
  onDuplicateWithPairing,
  onExportPng,
  onRememberBackId,
  onSaveChanges,
  preferredBackId,
  previewRef,
  routeError,
  savingMode,
  selectedTemplateId,
}: CardEditorWorkspaceProps) {
  const { t } = useI18n();
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  useEffect(() => {
    if (isRouteLoadingCard) {
      setIsPreviewVisible(false);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsPreviewVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isRouteLoadingCard, selectedTemplateId]);

  if (routeError) {
    return (
      <section
        className={`${styles.routeErrorPanel} d-flex align-items-center justify-content-center`}
      >
        <div className={`${styles.routeErrorCard} ${styles.uStackLg}`}>
          <div className={styles.routeErrorTitle}>{t("routeError.cardNotFoundTitle")}</div>
          <div className={styles.routeErrorBody}>
            {routeError === "not-found"
              ? t("routeError.cardNotFoundBody")
              : t("routeError.cardLoadFailedBody")}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onBackToCards}
          >
            {t("actions.backToCards")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <EditorTargetsProvider>
      <section className={`${styles.leftPanel} d-flex align-items-stretch gap-3 p-3`}>
        <div
          className={`${styles.previewContainer} d-flex align-items-center justify-content-center`}
        >
          <ToolsToolbar />
          {isRouteLoadingCard || !isPreviewVisible ? (
            <div
              className={styles.cardPreviewLoadingState}
              role="status"
              aria-label={t("ui.loading")}
              data-testid="card-preview-route-loading"
            >
              <svg
                className={styles.cardPreviewLoadingSvg}
                viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
                aria-hidden="true"
              >
                <image
                  href={blueprintFallback.src}
                  x="0"
                  y="0"
                  width={CARD_WIDTH}
                  height={CARD_HEIGHT}
                  preserveAspectRatio="xMidYMid slice"
                />
                <rect
                  width={CARD_WIDTH}
                  height={CARD_HEIGHT}
                  rx="28"
                  ry="28"
                  fill="rgba(8, 14, 26, 0.18)"
                />
                <rect
                  x="10"
                  y="10"
                  width={CARD_WIDTH - 20}
                  height={CARD_HEIGHT - 20}
                  rx="24"
                  ry="24"
                  fill="none"
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="3"
                />
              </svg>
              <div className={previewStyles.spinnerOverlay} aria-hidden="true">
                <div className={previewStyles.spinner} />
              </div>
            </div>
          ) : null}
          {selectedTemplateId && !isRouteLoadingCard ? (
            <div
              className={`${styles.cardPreviewFadeWrap} ${
                isPreviewVisible ? styles.cardPreviewFadeWrapVisible : ""
              }`}
            >
              <CardPreviewContainer previewRef={previewRef} preferredBackId={preferredBackId} />
            </div>
          ) : null}
        </div>
      </section>
      <aside className={`${styles.rightPanel} d-flex flex-column`}>
        <div className={styles.inspectorTop}>
          <TemplateChooser />
        </div>
        <div className={styles.inspectorBody}>
          <PreviewCanvasProvider previewRef={previewRef}>
            {isRouteLoadingCard ? (
              <InspectorStateNotice
                variant="loading"
                title={t("ui.loading")}
                body={t("ui.loading")}
                className={styles.cardInspectorRouteLoadingState}
              />
            ) : (
              <CardInspector
                activeFrontId={activeFrontId}
                autoOpenBackId={preferredBackId}
                frontViewToken={frontViewToken}
                onRememberBackId={onRememberBackId}
                pairingReferenceId={draftSourceCardId}
              />
            )}
          </PreviewCanvasProvider>
        </div>
        <EditorActionsToolbar
          canSaveChanges={canSaveChanges}
          canDuplicate={canDuplicate}
          savingMode={savingMode}
          onExportPng={onExportPng}
          exportMenuItems={exportMenuItems}
          onSaveChanges={onSaveChanges}
          onDuplicate={onDuplicate}
          onDuplicateWithPairing={onDuplicateWithPairing}
        />
      </aside>
    </EditorTargetsProvider>
  );
}
