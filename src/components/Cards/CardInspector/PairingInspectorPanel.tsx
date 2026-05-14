"use client";

import { ChevronDown, ChevronUp, Combine, Unlink2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useFormContext, useFormState, useWatch } from "react-hook-form";

import styles from "@/app/page.module.css";
import DeckFanByDeckId from "@/components/Decks/DeckFanByDeckId";
import { DEFAULT_DECK_FAN_PREVIEW_COUNT } from "@/components/Decks/deck-fan.constants";
import { buildDeckDeepLink } from "@/components/Decks/deckDeepLink";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useAppActions } from "@/components/Providers/AppActionsContext";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useEditorSave } from "@/components/Providers/EditorSaveContext";
import { usePreviewRenderer } from "@/components/Providers/PreviewRendererContext";
import { formatMessage } from "@/components/Stockpile/stockpile-utils";
import { ENABLE_CARD_THUMB_CACHE, ENABLE_WEBGL_RECENTER_ON_FACE_SELECT } from "@/config/flags";
import { cardTemplatesById } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import { apiClient } from "@/api/client";
import { resolveEffectiveFace } from "@/lib/card-face";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";
import {
  isPairDeleteConfirmRequiredError,
  isPairInUseError,
  type PairUsageReport,
} from "@/lib/decks-errors";
import { previewDeletePair } from "@/lib/pairs-service";
import type { CardFace } from "@/types/card-face";
import type { CardRecord } from "@/api/cards";
import type { TemplateId } from "@/types/templates";

import CollapsibleGroup from "./CollapsibleGroup";
import InspectorEntityRow from "./InspectorEntityRow";

type PairingInspectorPanelProps = {
  activeFrontId?: string | null;
  autoOpenBackId?: string | null;
  frontViewToken?: number;
  onRememberBackId?: (backId: string) => void;
  pairingReferenceId?: string | null;
};

type UnpairTarget = {
  frontFaceId: string;
  backFaceId: string;
  backTitle: string;
};

type PendingUnpairImpact = {
  targets: UnpairTarget[];
  usage: PairUsageReport["cascadePlan"]["usage"];
  decks: Array<{
    deckId: string;
    deckTitle: string;
    locations: Array<{ groupId: string; groupTitle: string; setId: string; setTitle: string }>;
  }>;
  message: string;
};

async function listPairsForFaceId(faceId: string) {
  return apiClient.listPairs({ queries: { faceId } });
}

async function createPairFor(frontFaceId: string, backFaceId: string) {
  return apiClient.createPair({ frontFaceId, backFaceId });
}

type PairingThumbImageProps = {
  cardId: string;
  thumbnailBlob?: Blob | null;
  templateThumbSrc?: string | null;
  delayMs?: number;
  onLoaded?: () => void;
};

function PairingThumbImage({
  cardId,
  thumbnailBlob,
  templateThumbSrc,
  delayMs,
  onLoaded,
}: PairingThumbImageProps) {
  const thumbUrl = useCardThumbnailUrl(cardId, thumbnailBlob ?? null, {
    enabled: true,
    useCache: ENABLE_CARD_THUMB_CACHE,
  });
  const style = delayMs ? { ["--pairing-thumb-delay" as never]: `${delayMs}ms` } : undefined;

  if (thumbUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={thumbUrl} alt="" style={style} onLoad={onLoaded} />;
  }
  if (templateThumbSrc) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={templateThumbSrc} alt="" style={style} onLoad={onLoaded} />;
  }
  return <div className={styles.inspectorStackPlaceholder} />;
}

export default function PairingInspectorPanel({
  activeFrontId,
  autoOpenBackId,
  frontViewToken,
  onRememberBackId,
  pairingReferenceId,
}: PairingInspectorPanelProps) {
  const { t } = useI18n();
  const fallbackTitle = t("label.untitledCard");
  const formatMessageWith = useMemo(
    () => (key: string, vars: Record<string, string | number>) => formatMessage(t(key as never), vars),
    [t],
  );
  const { requestRecenter } = usePreviewRenderer();
  const recenterTimeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { openStockpile } = useAppActions();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
  } = useCardEditor();
  const { control } = useFormContext();
  const { isDirty } = useFormState({ control });
  const faceValue = useWatch({ control, name: "face" }) as CardFace | undefined;
  const { saveCurrentCard, saveToken } = useEditorSave();

  const [pairedBacks, setPairedBacks] = useState<CardRecord[]>([]);
  const [pairedBacksToken, setPairedBacksToken] = useState(0);
  const [pairedBackFrontsMap, setPairedBackFrontsMap] = useState<Map<string, CardRecord[]>>(
    new Map(),
  );
  const [cardsById, setCardsById] = useState<Map<string, CardRecord>>(new Map());
  const [pairedFronts, setPairedFronts] = useState<CardRecord[]>([]);
  const [pairedFrontsToken, setPairedFrontsToken] = useState(0);
  const [pendingOpenCard, setPendingOpenCard] = useState<CardRecord | null>(null);
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
  const [pendingUnpairImpact, setPendingUnpairImpact] = useState<PendingUnpairImpact | null>(null);
  const [pairUsagePrompt, setPairUsagePrompt] = useState<PairUsageReport | null>(null);
  const [loadedThumbs, setLoadedThumbs] = useState<Record<string, boolean>>({});
  const [hoveredCard, setHoveredCard] = useState<CardRecord | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<DOMRect | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const currentTemplateId = selectedTemplateId ?? null;
  const template = currentTemplateId ? cardTemplatesById[currentTemplateId] : undefined;
  const activeCardId = currentTemplateId ? activeCardIdByTemplate[currentTemplateId] : undefined;
  const pairingSourceId = activeCardId ?? pairingReferenceId ?? null;
  const pairingDisabled = !activeCardId;
  const hoverThumbUrl = useCardThumbnailUrl(
    hoveredCard?.id ?? null,
    hoveredCard?.thumbnailBlob ?? null,
    {
      enabled: Boolean(hoveredCard),
      useCache: ENABLE_CARD_THUMB_CACHE,
    },
  );

  const effectiveFace = useMemo<CardFace | undefined>(() => {
    if (!template) return undefined;
    return resolveEffectiveFace(faceValue, template.defaultFace);
  }, [faceValue, template]);

  const sortByUpdated = (cards: CardRecord[]) =>
    cards.sort((a, b) => {
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      const aName = a.nameLower ?? a.name.toLocaleLowerCase();
      const bName = b.nameLower ?? b.name.toLocaleLowerCase();
      return aName.localeCompare(bName);
    });

  const openCard = async (cardId: string) => {
    navigate(`/cards/${cardId}`);
    if (ENABLE_WEBGL_RECENTER_ON_FACE_SELECT) {
      if (recenterTimeoutRef.current) {
        window.clearTimeout(recenterTimeoutRef.current);
      }
      recenterTimeoutRef.current = window.setTimeout(() => {
        requestRecenter();
      }, 90);
    }
  };

  const requestOpenCard = async (cardId: string) => {
    const currentTemplate = selectedTemplateId;
    if (currentTemplate && isDirty) {
      const record = await apiClient.getCard({ params: { id: cardId } });
      if (!record) return;
      setPendingOpenCard(record);
      setIsSavePromptOpen(true);
      return;
    }
    await openCard(cardId);
  };

  useEffect(() => {
    let active = true;
    const loadPairedBacks = async () => {
      if (effectiveFace !== "front") {
        if (!active) return;
        setPairedBacks([]);
        setPairedBackFrontsMap(new Map());
        return;
      }

      const cards = await apiClient.listCards({ queries: { status: "saved" } });
      if (!active) return;
      const byId = new Map(cards.map((card) => [card.id, card]));
      setCardsById(byId);

      let backIds: string[] = [];
      if (pairingSourceId) {
        const pairs = await listPairsForFaceId(pairingSourceId);
        if (!active) return;
        backIds = Array.from(
          new Set(
            pairs
              .filter((pair) => pair.frontFaceId === pairingSourceId)
              .map((pair) => pair.backFaceId)
              .filter((id): id is string => Boolean(id)),
          ),
        );
      }
      if (!backIds.length) {
        setPairedBacks([]);
        setPairedBackFrontsMap(new Map());
        return;
      }

      const matches = backIds
        .map((id) => byId.get(id))
        .filter((card): card is CardRecord => Boolean(card));
      const sorted = sortByUpdated(matches);
      setPairedBacks(sorted);
    };

    loadPairedBacks().catch(() => {
      if (!active) return;
      setPairedBacks([]);
      setPairedBackFrontsMap(new Map());
    });
    return () => {
      active = false;
    };
  }, [pairingSourceId, effectiveFace, pairedBacksToken, saveToken]);

  useEffect(() => {
    if (effectiveFace !== "back") {
      setPairedFronts([]);
      return;
    }
    let active = true;
    const loadFronts = async (cards: CardRecord[]) => {
      if (!active) return;
      const sorted = sortByUpdated([...cards]);
      setPairedFronts(sorted);
    };
    apiClient
      .listCards({ queries: { status: "saved" } })
      .then((cards) => {
        if (!active) return;
        setCardsById(new Map(cards.map((card) => [card.id, card])));
        if (pairingSourceId) {
          void listPairsForFaceId(pairingSourceId)
            .then((pairs) => {
              if (!active) return;
              const frontIds = new Set(
                pairs
                  .map((pair) => pair.frontFaceId)
                  .filter((id): id is string => Boolean(id)),
              );
              const matches = cards.filter((card) => frontIds.has(card.id));
              void loadFronts(matches);
            })
            .catch(() => {
              if (!active) return;
              setPairedFronts([]);
            });
          return;
        }
        setPairedFronts([]);
      })
      .catch(() => {
        if (!active) return;
        setPairedFronts([]);
      });

    return () => {
      active = false;
    };
  }, [pairingSourceId, effectiveFace, pairedFrontsToken, saveToken]);

  useEffect(() => {
    if (effectiveFace !== "front") {
      setPairedBackFrontsMap(new Map());
      return;
    }
    if (pairedBacks.length === 0 || cardsById.size === 0) {
      setPairedBackFrontsMap(new Map());
      return;
    }
    let active = true;
    const loadBackFronts = async () => {
      const nextMap = new Map<string, CardRecord[]>();
      await Promise.all(
        pairedBacks.map(async (back) => {
          const pairs = await listPairsForFaceId(back.id);
          if (!active) return;
          const frontIds = Array.from(
            new Set(
              pairs
                .filter((pair) => pair.backFaceId === back.id)
                .map((pair) => pair.frontFaceId)
                .filter((id): id is string => Boolean(id)),
            ),
          );
          const fronts = frontIds
            .map((id) => cardsById.get(id))
            .filter((card): card is CardRecord => Boolean(card));
          const sorted = sortByUpdated(fronts);
          nextMap.set(back.id, sorted);
        }),
      );
      if (!active) return;
      setPairedBackFrontsMap(nextMap);
    };
    loadBackFronts().catch(() => {
      if (!active) return;
      setPairedBackFrontsMap(new Map());
    });
    return () => {
      active = false;
    };
  }, [cardsById, effectiveFace, pairedBacks]);

  const hasPairedBacks = pairedBacks.length > 0;
  const pairedBackCount = pairedBacks.length;
  const selectedFrontId = effectiveFace === "back" ? activeFrontId ?? null : activeCardId ?? null;

  if (!template) {
    return null;
  }

  const deletePairBySafe = async (
    frontFaceId: string,
    backFaceId: string,
    confirmCascade = false,
  ) => {
    try {
      await apiClient.deletePair({
        frontFaceId,
        backFaceId,
        mode: "confirmable-cascade",
        confirmCascade,
      });
      return true;
    } catch (error) {
      if (isPairDeleteConfirmRequiredError(error)) {
        setPairUsagePrompt(error.report);
        return false;
      }
      if (isPairInUseError(error)) {
        setPairUsagePrompt({
          frontFaceId,
          backFaceId,
          mode: "block",
          cascadePlan: { pairIds: [], entryIds: [], usage: error.usage },
        });
        return false;
      }
      throw error;
    }
  };

  const deletePairsForFrontIdSafe = async (frontFaceId: string) => {
    const pairs = await listPairsForFaceId(frontFaceId);
    const deletions = pairs.filter(
      (pair) => pair.frontFaceId === frontFaceId && pair.backFaceId,
    );
    for (const pair of deletions) {
      const ok = await deletePairBySafe(frontFaceId, pair.backFaceId as string);
      if (!ok) return false;
    }
    return true;
  };

  const replacePairsForBackIdSafe = async (backFaceId: string, frontFaceIds: string[]) => {
    const existing = await listPairsForFaceId(backFaceId);
    const currentFrontIds = existing
      .filter((pair) => pair.backFaceId === backFaceId && pair.frontFaceId)
      .map((pair) => pair.frontFaceId as string);
    const nextFrontSet = new Set(frontFaceIds);
    const toRemove = currentFrontIds.filter((frontId) => !nextFrontSet.has(frontId));
    const toAdd = frontFaceIds.filter((frontId) => !currentFrontIds.includes(frontId));

    for (const frontId of toRemove) {
      const ok = await deletePairBySafe(frontId, backFaceId);
      if (!ok) return false;
    }
    if (toAdd.length) {
      await Promise.all(toAdd.map((frontId) => createPairFor(frontId, backFaceId)));
    }
    return true;
  };

  const buildPendingUnpairImpact = async (targets: UnpairTarget[]): Promise<PendingUnpairImpact> => {
    const usageRows: PairUsageReport["cascadePlan"]["usage"] = [];
    for (const target of targets) {
      const report = await previewDeletePair(target.frontFaceId, target.backFaceId, {
        mode: "confirmable-cascade",
      });
      usageRows.push(...report.cascadePlan.usage);
    }

    const usageByKey = new Map<string, PairUsageReport["cascadePlan"]["usage"][number]>();
    usageRows.forEach((usage) => {
      const key = `${usage.deckId}:${usage.groupId}:${usage.setId}`;
      if (!usageByKey.has(key)) usageByKey.set(key, usage);
    });
    const usage = Array.from(usageByKey.values());

    const deckMap = new Map<
      string,
      { deckId: string; deckTitle: string; locations: PendingUnpairImpact["decks"][number]["locations"] }
    >();
    usage.forEach((row) => {
      const current = deckMap.get(row.deckId) ?? {
        deckId: row.deckId,
        deckTitle: row.deckTitle,
        locations: [],
      };
      if (!current.locations.some((loc) => loc.groupId === row.groupId && loc.setId === row.setId)) {
        current.locations.push({
          groupId: row.groupId,
          groupTitle: row.groupTitle,
          setId: row.setId,
          setTitle: row.setTitle,
        });
      }
      deckMap.set(row.deckId, current);
    });

    const message =
      targets.length === 1
        ? formatMessageWith("warning.pairingLossSingle", { back: targets[0].backTitle || fallbackTitle })
        : formatMessageWith("warning.pairingLossMultipleBacks", { backCount: targets.length });

    return {
      targets,
      usage,
      decks: Array.from(deckMap.values()),
      message,
    };
  };

  const requestUnpairImpact = async (targets: UnpairTarget[]) => {
    if (!targets.length) return;
    const impact = await buildPendingUnpairImpact(targets);
    setPendingUnpairImpact(impact);
  };

  const markThumbLoaded = (cardId: string) => {
    setLoadedThumbs((prev) => {
      if (prev[cardId]) return prev;
      return { ...prev, [cardId]: true };
    });
  };

  const showHoverPreview = (card: CardRecord, element: HTMLElement) => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredCard(card);
    setHoverAnchor(element.getBoundingClientRect());
  };

  const hideHoverPreview = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredCard(null);
    setHoverAnchor(null);
  };

  return (
    <div className={styles.pairingPanel}>
      <div
        className={`${styles.inspectorPairRow} ${
          pairingDisabled ? styles.inspectorPairRowDisabled : ""
        }`}
      >
        {effectiveFace === "front" ? (
          <>
            <div className={styles.inspectorPairTitle}>
              {hasPairedBacks
                ? pairedBacks.length === 1
                  ? t("label.pairedBackFacingSingle")
                  : formatMessageWith("label.pairedBackFacingMultiple", {
                      count: pairedBacks.length,
                    })
                : t("cardFace.unpaired")}
            </div>
            <div className={`${styles.inspectorPairActions} ${styles.uRowSm}`}>
              <button
                type="button"
                className={`${styles.inspectorPairActionButton} ${
                  hasPairedBacks ? "" : styles.inspectorPairActionButtonEmpty
                }`}
                title={pairingDisabled ? t("tooltip.saveBeforePairing") : t("tooltip.pairBack")}
                disabled={pairingDisabled}
                onClick={() => {
                  if (pairingDisabled) return;
                  openStockpile({
                    mode: "pair-backs",
                    titleOverride: t("heading.selectBackCard"),
                    initialSelectedIds: pairedBacks.map((card) => card.id),
                    onConfirmSelection: async (cardIds) => {
                      if (!currentTemplateId) return;
                      if (!activeCardId) return;
                      const existingIds = new Set(pairedBacks.map((card) => card.id));
                      const nextIds = new Set(cardIds ?? []);
                      const toRemove = [...existingIds].filter((id) => !nextIds.has(id));
                      const toAdd = [...nextIds].filter((id) => !existingIds.has(id));
                      for (const id of toRemove) {
                        const ok = await deletePairBySafe(activeCardId, id);
                        if (!ok) return;
                      }
                      if (toAdd.length) {
                        await Promise.all(toAdd.map((id) => createPairFor(activeCardId, id)));
                      }
                      setPairedBacksToken((prev) => prev + 1);
                    },
                  });
                }}
              >
                <Combine size={18} aria-hidden="true" />
              </button>
              {hasPairedBacks ? (
                <button
                  type="button"
                  className={styles.inspectorPairActionButton}
                  title={
                    pairingDisabled ? t("tooltip.saveBeforePairing") : t("tooltip.unpairBackAll")
                  }
                  disabled={pairingDisabled}
                  onClick={() => {
                    if (pairingDisabled) return;
                    if (!activeCardId) return;
                    void requestUnpairImpact(
                      pairedBacks.map((back) => ({
                        frontFaceId: activeCardId,
                        backFaceId: back.id,
                        backTitle: back.title ?? fallbackTitle,
                      })),
                    );
                  }}
                >
                  <Unlink2 size={18} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </>
        ) : null}
        {effectiveFace === "back" ? (
          <>
            <div className={styles.inspectorPairTitle}>
              {pairedFronts.length === 0
                ? t("cardFace.unpaired")
                : pairedFronts.length === 1
                  ? t("label.pairedFrontFacingSingle")
                  : formatMessageWith("label.pairedFrontFacingMultiple", {
                      count: pairedFronts.length,
                    })}
            </div>
            <button
              type="button"
              className={`${styles.inspectorPairActionButton} ${
                pairedFronts.length > 0 ? "" : styles.inspectorPairActionButtonEmpty
              }`}
              title={pairingDisabled ? t("tooltip.saveBeforePairing") : t("tooltip.managePairings")}
              disabled={pairingDisabled}
              onClick={() => {
                if (pairingDisabled) return;
                if (!activeCardId) return;
                openStockpile({
                  mode: "pair-fronts",
                  titleOverride: t("heading.manageFrontPairings"),
                  initialSelectedIds: pairedFronts.map((card) => card.id),
                  onConfirmSelection: async (cardIds) => {
                    try {
                      await replacePairsForBackIdSafe(activeCardId, cardIds);
                    } catch {
                      // Ignore pair update errors for now.
                    }
                    try {
                      setPairedFrontsToken((prev) => prev + 1);
                    } catch {
                      // Ignore update errors for now.
                    }
                  },
                });
              }}
            >
              <Combine size={18} aria-hidden="true" />
            </button>
            <div className={`${styles.inspectorPairActions} ${styles.uRowSm}`} />
          </>
        ) : null}
      </div>
      <div className={styles.pairingPanelBody}>
        {effectiveFace === "back" ? (
          <div className={styles.pairingPanelGrid}>
            {pairedFronts.map((card, index) => {
              const templateThumb = cardTemplatesById[card.templateId]?.thumbnail;
              const isSelected = selectedFrontId === card.id;
              const isLoaded = Boolean(loadedThumbs[card.id]);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`${styles.pairingPanelGridItem} ${
                    isSelected ? styles.pairingPanelSelected : ""
                  } ${isLoaded ? styles.pairingPanelGridItemLoaded : ""} ${
                    pairingDisabled ? styles.pairingPanelGridItemDisabled : ""
                  }`}
                  disabled={pairingDisabled}
                  onMouseEnter={(event) => {
                    showHoverPreview(card, event.currentTarget);
                  }}
                  onMouseLeave={hideHoverPreview}
                  onClick={async () => {
                    if (pairingDisabled) return;
                    await requestOpenCard(card.id);
                  }}
                >
                  <PairingThumbImage
                    cardId={card.id}
                    thumbnailBlob={card.thumbnailBlob ?? null}
                    templateThumbSrc={templateThumb?.src ?? null}
                    delayMs={index * 25}
                    onLoaded={() => markThumbLoaded(card.id)}
                  />
                </button>
              );
            })}
          </div>
        ) : null}
        {effectiveFace === "front" ? (
          <div
            key={`pairing-groups-${frontViewToken ?? 0}`}
            className={styles.pairingPanelGroups}
          >
            {pairedBacks.map((backCard) => {
              const backTemplateThumb = cardTemplatesById[backCard.templateId]?.thumbnail;
              const groupFrontCards = pairedBackFrontsMap.get(backCard.id) ?? [];
              const backTitle = backCard.title ?? fallbackTitle;
              const groupCountLabel =
                groupFrontCards.length === 1
                  ? t("label.frontFacingCountSingle")
                  : formatMessageWith("label.frontFacingCountMultiple", {
                      count: groupFrontCards.length,
                    });
              return (
                <CollapsibleGroup
                  key={backCard.id}
                  id={`pairing-group-${backCard.id}`}
                  className={styles.pairingPanelGroup}
                  headerClassName={`${styles.pairingPanelGroupHeader} ${styles.uRowLg}`}
                  headerButtonClassName={`${styles.pairingPanelGroupHeaderButton} ${styles.uRowLg}`}
                  bodyClassName={styles.pairingPanelGroupBody}
                  defaultOpen={autoOpenBackId === backCard.id}
                  headerContent={
                    <InspectorEntityRow
                      as="div"
                      className={styles.pairingPanelGroupHeaderRow}
                      title={backTitle}
                      subtitle={groupCountLabel}
                      left={
                        <button
                          type="button"
                          className={`${styles.pairingPanelGroupThumb} ${
                            pairingDisabled ? styles.pairingPanelGroupThumbDisabled : ""
                          }`}
                          disabled={pairingDisabled}
                          onMouseEnter={(event) => {
                            showHoverPreview(backCard, event.currentTarget);
                          }}
                          onMouseLeave={hideHoverPreview}
                          onClick={async (event) => {
                            event.stopPropagation();
                            if (pairingDisabled) return;
                            await requestOpenCard(backCard.id);
                          }}
                        >
                          <PairingThumbImage
                            cardId={backCard.id}
                            thumbnailBlob={backCard.thumbnailBlob ?? null}
                            templateThumbSrc={backTemplateThumb?.src ?? null}
                          />
                        </button>
                      }
                      right={<span className={styles.pairingPanelGroupControls} aria-hidden="true">
                      <button
                        type="button"
                        className={`${styles.pairingPanelGroupUnpair} ${
                          pairingDisabled ? styles.pairingPanelGroupUnpairDisabled : ""
                        }`}
                        disabled={pairingDisabled}
                          title={
                            pairingDisabled
                              ? t("tooltip.saveBeforePairing")
                              : t("tooltip.unpairBack")
                          }
                        onClick={async (event) => {
                          event.stopPropagation();
                          if (pairingDisabled) return;
                          if (!activeCardId) return;
                          await requestUnpairImpact([
                            {
                              frontFaceId: activeCardId,
                              backFaceId: backCard.id,
                              backTitle: backCard.title ?? fallbackTitle,
                            },
                          ]);
                        }}
                      >
                        <Unlink2 size={18} aria-hidden="true" />
                      </button>
                      <span className={styles.pairingPanelGroupChevron}>
                        <ChevronDown size={18} className={styles.pairingPanelGroupChevronDown} />
                        <ChevronUp size={18} className={styles.pairingPanelGroupChevronUp} />
                      </span>
                      </span>}
                    />
                  }
                >
                  <div className={styles.pairingPanelGroupGrid}>
                    {groupFrontCards.map((frontCard, index) => {
                      const frontTemplateThumb =
                        cardTemplatesById[frontCard.templateId]?.thumbnail;
                      const isSelected = selectedFrontId === frontCard.id;
                      const isLoaded = Boolean(loadedThumbs[frontCard.id]);
                      return (
                        <button
                          key={frontCard.id}
                          type="button"
                          className={`${styles.pairingPanelGridItem} ${
                            isSelected ? styles.pairingPanelSelected : ""
                          } ${isLoaded ? styles.pairingPanelGridItemLoaded : ""} ${
                            pairingDisabled ? styles.pairingPanelGridItemDisabled : ""
                          }`}
                          disabled={pairingDisabled}
                          onMouseEnter={(event) => {
                            showHoverPreview(frontCard, event.currentTarget);
                          }}
                          onMouseLeave={hideHoverPreview}
                          onClick={async () => {
                            if (pairingDisabled) return;
                            onRememberBackId?.(backCard.id);
                            await requestOpenCard(frontCard.id);
                          }}
                        >
                          <PairingThumbImage
                            cardId={frontCard.id}
                            thumbnailBlob={frontCard.thumbnailBlob ?? null}
                            templateThumbSrc={frontTemplateThumb?.src ?? null}
                            delayMs={index * 25}
                            onLoaded={() => markThumbLoaded(frontCard.id)}
                          />
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleGroup>
              );
            })}
          </div>
        ) : null}
      </div>
      <ConfirmModal
        isOpen={isSavePromptOpen}
        title={t("heading.saveBeforeView")}
        confirmLabel={t("actions.save")}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          setIsSavePromptOpen(false);
          const nextOpenCard = pendingOpenCard;
          setPendingOpenCard(null);
          const saved = await saveCurrentCard();
          if (!saved) return;
          if (nextOpenCard) {
            await openCard(nextOpenCard.id);
          }
        }}
        onCancel={() => {
          setIsSavePromptOpen(false);
          setPendingOpenCard(null);
        }}
      >
        {t("confirm.saveBeforeViewBody")}
      </ConfirmModal>
      <ConfirmModal
        isOpen={Boolean(pendingUnpairImpact)}
        title={pendingUnpairImpact?.usage.length ? t("decks.pairInUseTitle") : "Confirm unpair"}
        confirmLabel={t("actions.confirm")}
        extraLabel={pendingUnpairImpact?.usage.length ? t("decks.openDeck") : undefined}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          const pending = pendingUnpairImpact;
          setPendingUnpairImpact(null);
          if (!pending) return;
          const seen = new Set<string>();
          for (const target of pending.targets) {
            const key = `${target.frontFaceId}|${target.backFaceId}`;
            if (seen.has(key)) continue;
            seen.add(key);
            await apiClient.deletePair({
              frontFaceId: target.frontFaceId,
              backFaceId: target.backFaceId,
              mode: "confirmable-cascade",
              confirmCascade: true,
            });
          }
          setPairedBacksToken((prev) => prev + 1);
          setPairedFrontsToken((prev) => prev + 1);
        }}
        onExtra={() => {
          const first = pendingUnpairImpact?.decks[0];
          if (!first) return;
          const location = first.locations[0];
          navigate(
            buildDeckDeepLink({
              deckId: first.deckId,
              setId: location?.setId ?? null,
            }),
          );
          setPendingUnpairImpact(null);
        }}
        onCancel={() => setPendingUnpairImpact(null)}
      >
        <div className={styles.pairingUsageList}>
          {pendingUnpairImpact?.usage.length ? (
            <>
              <div>
                This will unpair and remove dependent deck entries from the following locations:
              </div>
              <div className={styles.pairingUsageDecks}>
                {pendingUnpairImpact.decks.map((deck) => (
                  <div
                    key={deck.deckId}
                    className={`${styles.pairingUsageDeckRow} ${styles.pairingUsageDeckRowInspector}`}
                  >
                    <div className={styles.pairingUsageDeckTitle}>{deck.deckTitle}</div>
                    <div className={styles.pairingUsageDeckFan}>
                      <DeckFanByDeckId
                        deckId={deck.deckId}
                        maxCount={DEFAULT_DECK_FAN_PREVIEW_COUNT}
                        variant="inspector"
                        spacing={0.7}
                        tilt={0.5}
                        showPlaceholdersWhenEmpty
                        emptyPlaceholderVariant="deck-empty"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div>{pendingUnpairImpact?.message ?? null}</div>
          )}
        </div>
      </ConfirmModal>
      <ConfirmModal
        isOpen={Boolean(pairUsagePrompt)}
        title={t("decks.pairInUseTitle")}
        confirmLabel={t("actions.confirm")}
        extraLabel={t("decks.openDeck")}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          const pending = pairUsagePrompt;
          setPairUsagePrompt(null);
          if (!pending) return;
          await deletePairBySafe(pending.frontFaceId, pending.backFaceId, true);
          setPairedBacksToken((prev) => prev + 1);
          setPairedFrontsToken((prev) => prev + 1);
        }}
        onExtra={() => {
          const first = pairUsagePrompt?.cascadePlan.usage[0];
          if (!first) return;
          navigate(buildDeckDeepLink({ deckId: first.deckId, setId: first.setId }));
          setPairUsagePrompt(null);
        }}
        onCancel={() => setPairUsagePrompt(null)}
      >
        <div className={styles.pairingUsageList}>
          <div>
            This will unpair and remove dependent deck entries from the following locations:
          </div>
          <ul className={styles.pairingUsageItems}>
            {(pairUsagePrompt?.cascadePlan.usage ?? []).map((usage) => (
              <li key={`${usage.deckId}-${usage.setId}`}>
                {`${usage.deckTitle} › ${usage.groupTitle} › ${usage.setTitle}`}
              </li>
            ))}
          </ul>
        </div>
      </ConfirmModal>
      {hoveredCard && hoverAnchor && typeof document !== "undefined"
          ? (() => {
            const templateThumb = cardTemplatesById[hoveredCard.templateId]?.thumbnail;
            const popoverWidth = 120 + 16;
            const popoverHeight = 168 + 16;
            const left = Math.min(hoverAnchor.left, window.innerWidth - popoverWidth - 16);
            const belowTop = hoverAnchor.bottom + 6;
            const aboveTop = hoverAnchor.top - popoverHeight - 6;
            const canShowBelow = belowTop + popoverHeight + 16 <= window.innerHeight;
            const top = canShowBelow
              ? Math.min(belowTop, window.innerHeight - popoverHeight - 16)
              : Math.max(16, aboveTop);

            return createPortal(
              <div
                className={styles.pairingPanelHoverPopover}
                style={{ left, top }}
                aria-hidden="true"
                onMouseEnter={hideHoverPreview}
                onMouseLeave={hideHoverPreview}
              >
                <div className={styles.pairingPanelHoverCard}>
                  {hoverThumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hoverThumbUrl} alt="" />
                  ) : templateThumb?.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={templateThumb.src} alt="" />
                  ) : (
                    <div className={styles.inspectorStackPlaceholder} />
                  )}
                </div>
              </div>,
              document.body,
            );
          })()
        : null}
    </div>
  );
}
