"use client";

import { useDraggable } from "@dnd-kit/core";

import styles from "@/app/page.module.css";
import RemoteCardThumbnail from "@/components/common/CardThumbnail/RemoteCardThumbnail";
import SavedCardTile from "@/components/common/SavedCardTile";
import { formatMessage } from "@/components/Stockpile/stockpile-utils";
import StockpilePairIndicator from "@/components/Stockpile/StockpilePairIndicator";
import StockpileSelectCheckbox from "@/components/Stockpile/StockpileSelectCheckbox";
import type {
  StockpileCardActions,
  StockpileCardGroupView,
  StockpileCardView,
} from "@/components/Stockpile/types";
import { useI18n } from "@/i18n/I18nProvider";

const ENABLE_LEGACY_GRID_CARD_LAYOUT = false;
const DEBUG_DISABLE_STOCKPILE_GRID_ITEMS = false;
const DEBUG_DISABLE_STOCKPILE_GRID_ITEM_CONTENT = false;
const DEBUG_DISABLE_STOCKPILE_GRID_THUMBNAIL = false;
const DEBUG_DISABLE_STOCKPILE_GRID_META = false;
const DEBUG_DISABLE_STOCKPILE_GRID_PAIR_INDICATOR = false;

type StockpileCardsGridProps = {
  items: StockpileCardView[];
  groups?: StockpileCardGroupView[];
  actions: StockpileCardActions;
  isPairMode: boolean;
  dragEnabled: boolean;
  onClearSelection: () => void;
};

type StockpileCardsGridItemProps = {
  card: StockpileCardView;
  actions: StockpileCardActions;
  isPairMode: boolean;
  dragEnabled: boolean;
};

function StockpileCardsGridItem({
  card,
  actions,
  isPairMode,
  dragEnabled,
}: StockpileCardsGridItemProps) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    disabled: !dragEnabled,
  });
  const selectLabel = formatMessage(t("aria.selectCard"), { name: card.name });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.stockpileCardTile} ${
        card.isSelected ? styles.stockpileCardTileSelected : ""
      } ${
        isDragging ? styles.stockpileCardDragging : ""
      }`}
      aria-label={card.name}
      onClick={(event) => actions.onCardClick(card.id, event, isPairMode)}
      onDoubleClick={() => {
        if (isPairMode) return;
        actions.onCardDoubleClick(card.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          actions.onCardSelectSingle(card.id);
          return;
        }
        if (event.key === " ") {
          event.preventDefault();
          actions.onCardSetSelected(card.id, !card.isSelected, isPairMode);
        }
      }}
      {...attributes}
      {...listeners}
    >
      {DEBUG_DISABLE_STOCKPILE_GRID_ITEM_CONTENT ? null : ENABLE_LEGACY_GRID_CARD_LAYOUT ? (
        <div className={styles.stockpileGridVariant}>
          {isPairMode ? null : (
            <div className={styles.stockpileGridRowHeader}>
              <div className={styles.cardsItemName} title={card.name}>
                {card.name}
              </div>
              <StockpileSelectCheckbox
                card={card}
                actions={actions}
                isPairMode={isPairMode}
                label={selectLabel}
              />
            </div>
          )}
          <div className={styles.stockpileGridRowBody}>
            <div className={styles.stockpileGridColumnThumb}>
              {DEBUG_DISABLE_STOCKPILE_GRID_THUMBNAIL ? null : (
                <RemoteCardThumbnail
                  cardId={card.id}
                  thumbnailBlob={card.thumbnailBlob}
                  templateThumbSrc={card.templateThumbSrc ?? null}
                  alt={card.name}
                  variant="md"
                  fit="contain"
                />
              )}
            </div>
            {isPairMode ? null : (
              <div className={styles.stockpileGridColumnMeta}>
              <div
                className={`${styles.cardsItemTemplate} ${styles[`cardsType_${card.templateId}`]} ${
                  styles.stockpileGridTypeVertical
                }`}
              >
                {card.templateLabel}
              </div>
                <StockpilePairIndicator
                  card={card}
                  actions={actions}
                  isPairMode={isPairMode}
                  variant="grid"
                />
              </div>
            )}
          </div>
          {isPairMode ? null : (
            <div className={styles.stockpileGridRowFooter}>
              <div className={styles.cardsItemDetails}>
                {card.updatedLabel} {card.timeLabel}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {isPairMode ? (
            DEBUG_DISABLE_STOCKPILE_GRID_THUMBNAIL ? null : (
              <RemoteCardThumbnail
                cardId={card.id}
                thumbnailBlob={card.thumbnailBlob}
                templateThumbSrc={card.templateThumbSrc ?? null}
                alt={card.name}
                variant="md"
                fit="contain"
              />
            )
          ) : (
            <SavedCardTile
              title={card.name}
              templateLabel={card.templateLabel}
              variant="stockpile"
              topToolbarTestId="stockpile-card-top-toolbar"
              bottomToolbarTestId="stockpile-card-bottom-toolbar"
              typePillClassName={`${styles.cardsItemTemplate} ${styles[`cardsType_${card.templateId}`]}`}
              thumbnail={
                DEBUG_DISABLE_STOCKPILE_GRID_THUMBNAIL ? null : (
                  <RemoteCardThumbnail
                    cardId={card.id}
                    thumbnailBlob={card.thumbnailBlob}
                    templateThumbSrc={card.templateThumbSrc ?? null}
                    alt={card.name}
                    variant="md"
                    fit="contain"
                  />
                )
              }
            />
          )}
        </>
      )}
    </div>
  );
}

export default function StockpileCardsGrid({
  items,
  groups = [],
  actions,
  isPairMode,
  dragEnabled,
  onClearSelection,
}: StockpileCardsGridProps) {
  return (
    <div
      className={groups.length > 0 ? styles.stockpileCardsGridSurface : styles.stockpileCardsGrid}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        onClearSelection();
      }}
    >
      {DEBUG_DISABLE_STOCKPILE_GRID_ITEMS ? null : groups.length > 0 ? (
        <div className={styles.stockpileCardGroups}>
          {groups.map((group) => (
            <section
              key={group.id}
              className={styles.stockpileCardGroup}
              aria-label={group.label}
            >
              <h3 className={styles.stockpileCardGroupTitle}>{group.label}</h3>
              <div className={styles.stockpileCardsGrid}>
                {group.cards.map((card) => (
                  <StockpileCardsGridItem
                    key={card.id}
                    card={card}
                    actions={actions}
                    isPairMode={isPairMode}
                    dragEnabled={dragEnabled}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        items.map((card) => (
          <StockpileCardsGridItem
            key={card.id}
            card={card}
            actions={actions}
            isPairMode={isPairMode}
            dragEnabled={dragEnabled}
          />
        ))
      )}
    </div>
  );
}
