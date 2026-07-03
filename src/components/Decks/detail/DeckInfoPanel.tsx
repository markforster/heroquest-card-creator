"use client";

import { useEffect, useMemo, useState } from "react";

import { apiClient } from "@/api/client";
import styles from "@/app/page.module.css";
import CardFan from "@/components/Decks/CardFan";
import { resolveDeckExportFaceIds } from "@/components/Decks/deck-export";
import { DEFAULT_DECK_FAN_PREVIEW_COUNT } from "@/components/Decks/deck-fan.constants";
import { listPairsMap, orderDeckPreviewCandidateIds } from "@/components/Decks/deck-preview";
import { useI18n } from "@/i18n/I18nProvider";

function buildDeckPreviewCardIds({
  keySetId,
  groups,
  sets,
}: {
  keySetId: string | null;
  groups: Array<{ id: string; sortIndex?: number }>;
  sets: Array<{ id: string; groupId: string; backFaceId: string; sortIndex?: number }>;
}) {
  const orderedGroups = [...groups].sort(
    (a, b) => (a.sortIndex ?? Number.MAX_SAFE_INTEGER) - (b.sortIndex ?? Number.MAX_SAFE_INTEGER),
  );
  const setsByGroup = new Map<string, typeof sets>();
  sets.forEach((set) => {
    const list = setsByGroup.get(set.groupId) ?? [];
    list.push(set);
    setsByGroup.set(set.groupId, list);
  });
  setsByGroup.forEach((list, groupId) => {
    setsByGroup.set(
      groupId,
      [...list].sort(
        (a, b) =>
          (a.sortIndex ?? Number.MAX_SAFE_INTEGER) - (b.sortIndex ?? Number.MAX_SAFE_INTEGER),
      ),
    );
  });
  const orderedSets = orderedGroups.flatMap((group) => setsByGroup.get(group.id) ?? []);
  const seen = new Set<string>();
  const ids: string[] = [];

  if (keySetId) {
    const keySet = orderedSets.find((set) => set.id === keySetId) ?? null;
    if (keySet?.backFaceId && !seen.has(keySet.backFaceId)) {
      ids.push(keySet.backFaceId);
      seen.add(keySet.backFaceId);
    }
  }

  for (const set of orderedSets) {
    if (set.id === keySetId) continue;
    if (!set.backFaceId || seen.has(set.backFaceId)) continue;
    ids.push(set.backFaceId);
    seen.add(set.backFaceId);
    if (ids.length >= DEFAULT_DECK_FAN_PREVIEW_COUNT) break;
  }

  return orderDeckPreviewCandidateIds(ids.slice(0, DEFAULT_DECK_FAN_PREVIEW_COUNT));
}

export default function DeckInfoPanel({ deckId }: { deckId: string | null }) {
  const { t } = useI18n();
  const [metaState, setMetaState] = useState<{
    isLoading: boolean;
    error: boolean;
    createdAt: number | null;
    updatedAt: number | null;
    groupCount: number;
    setCount: number;
    entryCount: number;
    imageExport: { totalCount: number; frontCount: number; backCount: number; setCount: number };
    uniquePairCount: number;
    quantityTotal: number;
    pairedNotInSetCount: number;
    deckPreviewCardIds: string[];
  }>({
    isLoading: false,
    error: false,
    createdAt: null,
    updatedAt: null,
    groupCount: 0,
    setCount: 0,
    entryCount: 0,
    imageExport: { totalCount: 0, frontCount: 0, backCount: 0, setCount: 0 },
    uniquePairCount: 0,
    quantityTotal: 0,
    pairedNotInSetCount: 0,
    deckPreviewCardIds: [],
  });

  useEffect(() => {
    let cancelled = false;
    const loadMetadata = async () => {
      if (!deckId) return;
      setMetaState((prev) => ({ ...prev, isLoading: true, error: false }));
      try {
        const [deck, groups, sets, pairMap, imageExport] = await Promise.all([
          apiClient.getDeck({ params: { deckId } }),
          apiClient.listDeckGroups({ params: { deckId } }),
          apiClient.listDeckSets({ params: { deckId } }),
          listPairsMap(),
          resolveDeckExportFaceIds(deckId),
        ]);
        const entriesBySet = await Promise.all(
          sets.map(async (set) => ({
            setId: set.id,
            entries: await apiClient.listDeckEntries({ params: { setId: set.id } }),
          })),
        );
        const allEntries = entriesBySet.flatMap((group) => group.entries);
        const uniquePairCount = new Set(allEntries.map((entry) => entry.pairId)).size;
        const quantityTotal = allEntries.reduce((sum, entry) => sum + (entry.count ?? 1), 0);
        const pairedNotInSet = new Set<string>();

        const pairsByBackFace = new Map<string, string[]>();
        pairMap.forEach((pair) => {
          if (!pair.backFaceId || !pair.frontFaceId) return;
          const list = pairsByBackFace.get(pair.backFaceId) ?? [];
          list.push(pair.frontFaceId);
          pairsByBackFace.set(pair.backFaceId, list);
        });

        entriesBySet.forEach(({ setId, entries }) => {
          const set = sets.find((item) => item.id === setId);
          if (!set) return;
          const pairedFronts = pairsByBackFace.get(set.backFaceId) ?? [];
          const presentFronts = new Set<string>();
          entries.forEach((entry) => {
            const frontId = pairMap.get(entry.pairId)?.frontFaceId;
            if (frontId) presentFronts.add(frontId);
          });
          pairedFronts.forEach((frontId) => {
            if (!presentFronts.has(frontId)) pairedNotInSet.add(frontId);
          });
        });

        if (cancelled) return;
        setMetaState({
          isLoading: false,
          error: false,
          createdAt: deck?.createdAt ?? null,
          updatedAt: deck?.updatedAt ?? null,
          groupCount: groups.length,
          setCount: sets.length,
          entryCount: allEntries.length,
          imageExport,
          uniquePairCount,
          quantityTotal,
          pairedNotInSetCount: pairedNotInSet.size,
          deckPreviewCardIds: buildDeckPreviewCardIds({
            keySetId: deck?.keySetId ?? null,
            groups,
            sets,
          }),
        });
      } catch {
        if (cancelled) return;
        setMetaState((prev) => ({ ...prev, isLoading: false, error: true }));
      }
    };
    void loadMetadata();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  const createdAtLabel = useMemo(
    () =>
      metaState.createdAt ? new Date(metaState.createdAt).toLocaleString() : t("label.unknownVersion"),
    [metaState.createdAt, t],
  );
  const updatedAtLabel = useMemo(
    () =>
      metaState.updatedAt ? new Date(metaState.updatedAt).toLocaleString() : t("label.unknownVersion"),
    [metaState.updatedAt, t],
  );

  return (
    <div className={styles.deckMetaPanel}>
      <div className={styles.deckFaceModeHeader}>
        <div className={styles.deckFaceModeTitle}>{t("decks.meta.title")}</div>
      </div>
      <div className={styles.deckMetaFanSection} data-testid="deck-meta-fan">
        <div className={styles.deckMetaFanInner}>
          <span className={styles.deckBreadcrumbFan} aria-hidden="true">
            <CardFan
              cardIds={metaState.deckPreviewCardIds}
              variant="lg"
              maxCount={DEFAULT_DECK_FAN_PREVIEW_COUNT}
              showPlaceholdersWhenEmpty
              emptyPlaceholderVariant="deck-empty"
              spacing={0.65}
              tilt={0.55}
            />
          </span>
        </div>
      </div>
      <div className={styles.deckMetaDetailsSection}>
        {metaState.isLoading ? (
          <div className={styles.inspectorModeEmpty}>{t("decks.meta.loading")}</div>
        ) : null}
        {!metaState.isLoading && metaState.error ? (
          <div className={styles.inspectorModeEmpty}>{t("decks.meta.error")}</div>
        ) : null}
        {!metaState.isLoading && !metaState.error ? (
          <>
            <dl className={styles.assetsInspectorDetails}>
              <div className={styles.uRowLg}>
                <dt>{t("decks.meta.created")}</dt>
                <dd>{createdAtLabel}</dd>
              </div>
              <div className={styles.uRowLg}>
                <dt>{t("decks.meta.modified")}</dt>
                <dd>{updatedAtLabel}</dd>
              </div>
              <div className={styles.uRowLg}>
                <dt>{t("decks.meta.groups")}</dt>
                <dd>{metaState.groupCount}</dd>
              </div>
              <div className={styles.uRowLg}>
                <dt>{t("decks.meta.sets")}</dt>
                <dd>{metaState.setCount}</dd>
              </div>
              <div className={styles.uRowLg}>
                <dt>{t("decks.meta.entries")}</dt>
                <dd>{metaState.entryCount}</dd>
              </div>
            </dl>
            <div className={styles.assetsInspectorUsage}>
              <div className={styles.assetsInspectorSectionTitle}>
                {t("decks.meta.images.section")}
              </div>
              <dl className={styles.assetsInspectorDetails}>
                <div className={styles.uRowLg}>
                  <dt>{t("decks.meta.images.totalUnique")}</dt>
                  <dd>{metaState.imageExport.totalCount}</dd>
                </div>
                <div className={styles.uRowLg}>
                  <dt>{t("decks.meta.images.frontUnique")}</dt>
                  <dd>{metaState.imageExport.frontCount}</dd>
                </div>
                <div className={styles.uRowLg}>
                  <dt>{t("decks.meta.images.backUnique")}</dt>
                  <dd>{metaState.imageExport.backCount}</dd>
                </div>
                <div className={styles.uRowLg}>
                  <dt>{t("decks.meta.images.setSnapshot")}</dt>
                  <dd>{metaState.imageExport.setCount}</dd>
                </div>
              </dl>
            </div>
            <div className={styles.assetsInspectorUsage}>
              <div className={styles.assetsInspectorSectionTitle}>{t("decks.meta.pdf.section")}</div>
              <dl className={styles.assetsInspectorDetails}>
                <div className={styles.uRowLg}>
                  <dt>{t("decks.meta.pdf.uniquePairs")}</dt>
                  <dd>{metaState.uniquePairCount}</dd>
                </div>
                <div className={styles.uRowLg}>
                  <dt>{t("decks.meta.pdf.quantityTotal")}</dt>
                  <dd>{metaState.quantityTotal}</dd>
                </div>
              </dl>
            </div>
            <div className={styles.assetsInspectorUsage}>
              <div className={styles.assetsInspectorSectionTitle}>
                {t("decks.meta.health.section")}
              </div>
              <dl className={styles.assetsInspectorDetails}>
                <div className={styles.uRowLg}>
                  <dt>{t("decks.meta.health.pairedMissing")}</dt>
                  <dd>{metaState.pairedNotInSetCount}</dd>
                </div>
              </dl>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
