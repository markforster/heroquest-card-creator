"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Image,
  ImagePlus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  XCircle,
  ZoomIn,
  ZoomOut,
  Pin,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useFormContext, useWatch } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { AssetsModal } from "@/components/Assets";
import IconButton from "@/components/common/IconButton";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { usePopupState } from "@/hooks/usePopupState";
import { useI18n } from "@/i18n/I18nProvider";
import { getAllAssets, getAssetObjectUrl } from "@/lib/assets-db";
import { clamp } from "@/lib/math";
import type { AssetRecord } from "@/lib/assets-db";
import FormLabelWithIcon from "@/components/Cards/CardInspector/FormLabelWithIcon";
import { addPinnedAsset, getAssetKindLabel } from "@/components/Cards/CardInspector/asset-utils";

type MonsterIconFieldProps = {
  label: string;
};

type LastClearedIcon = {
  id: string;
  name?: string;
};

export default function MonsterIconField({ label }: MonsterIconFieldProps) {
  const { t } = useI18n();
  const {
    setValue,
    formState: { errors },
  } = useFormContext();

  const iconAssetId = useWatch({ name: "iconAssetId" }) as string | undefined;
  const iconAssetNameWatch = useWatch({ name: "iconAssetName" }) as string | undefined;
  const iconOffsetXWatch = useWatch({ name: "iconOffsetX" }) as number | undefined;
  const iconOffsetYWatch = useWatch({ name: "iconOffsetY" }) as number | undefined;
  const iconScaleWatch = useWatch({ name: "iconScale" }) as number | undefined;
  const iconRotationWatch = useWatch({ name: "iconRotation" }) as number | undefined;
  const picker = usePopupState(false);

  const fieldError = (errors as Record<string, { message?: string }>).iconAssetId;
  const iconAssetName = iconAssetNameWatch;
  const iconOffsetX = Number.isFinite(iconOffsetXWatch) ? (iconOffsetXWatch as number) : 0;
  const iconOffsetY = Number.isFinite(iconOffsetYWatch) ? (iconOffsetYWatch as number) : 0;
  const iconScale = Number.isFinite(iconScaleWatch) ? (iconScaleWatch as number) : 1;
  const iconRotation = Number.isFinite(iconRotationWatch) ? (iconRotationWatch as number) : 0;

  const [isAdjustmentsOpen, setIsAdjustmentsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const adjustmentsButtonRef = useRef<HTMLButtonElement | null>(null);
  const adjustmentsPopoverRef = useRef<HTMLDivElement | null>(null);
  const [adjustmentsStyle, setAdjustmentsStyle] = useState<CSSProperties | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [lastCleared, setLastCleared] = useState<LastClearedIcon | null>(null);
  const inputWrapRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 3;
  const SCALE_STEP = 0.05;
  const MIN_ROTATION = -180;
  const MAX_ROTATION = 180;
  const ROTATION_STEP = 1;

  const currentDisplayValue = iconAssetId
    ? (iconAssetName ?? t("status.imageSelected"))
    : t("status.noImageSelected");

  const applyAssetSelection = (asset: AssetRecord) => {
    setValue("iconAssetId", asset.id, { shouldDirty: true, shouldTouch: true });
    setValue("iconAssetName", asset.name, { shouldDirty: true, shouldTouch: true });
    setValue("iconOffsetX", 0, { shouldDirty: true, shouldTouch: true });
    setValue("iconOffsetY", 0, { shouldDirty: true, shouldTouch: true });
    setValue("iconScale", 1, { shouldDirty: true, shouldTouch: true });
    setValue("iconRotation", 0, { shouldDirty: true, shouldTouch: true });
  };

  const handleRestoreLastCleared = () => {
    if (!lastCleared) return;
    setValue("iconAssetId", lastCleared.id, { shouldDirty: true, shouldTouch: true });
    if (lastCleared.name) {
      setValue("iconAssetName", lastCleared.name, { shouldDirty: true, shouldTouch: true });
    }
    setValue("iconOffsetX", 0, { shouldDirty: true, shouldTouch: true });
    setValue("iconOffsetY", 0, { shouldDirty: true, shouldTouch: true });
    setValue("iconScale", 1, { shouldDirty: true, shouldTouch: true });
    setValue("iconRotation", 0, { shouldDirty: true, shouldTouch: true });
    setLastCleared(null);
  };

  const resetSearchState = () => {
    setIsDropdownOpen(false);
    setIsEditing(false);
    setQuery("");
  };

  useOutsideClick(
    [adjustmentsPopoverRef, adjustmentsButtonRef],
    () => setIsAdjustmentsOpen(false),
    isAdjustmentsOpen,
  );

  useOutsideClick([inputWrapRef, dropdownRef], resetSearchState, isDropdownOpen);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isEditing) return;

    let cancelled = false;

    getAllAssets()
      .then((records) => {
        if (!cancelled) {
          setAssets(records);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssets([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing || assets.length === 0) {
      setThumbUrls({});
      return;
    }

    let cancelled = false;
    const localUrls: Record<string, string> = {};

    (async () => {
      for (const asset of assets) {
        try {
          const url = await getAssetObjectUrl(asset.id);
          if (!url) continue;
          localUrls[asset.id] = url;
        } catch {
          // Ignore individual asset errors.
        }
      }
      if (!cancelled) {
        setThumbUrls(localUrls);
      } else {
        Object.values(localUrls).forEach((url) => {
          URL.revokeObjectURL(url);
        });
      }
    })();

    return () => {
      cancelled = true;
      Object.values(localUrls).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [assets, isEditing]);

  const normalizedQuery = query.trim().toLowerCase();
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const pinnedIds = new Set<string>();
  const pinnedAssets: AssetRecord[] = [];
  const getAssetRank = (asset: AssetRecord) => {
    if (asset.assetKindStatus === "classified") {
      if (asset.assetKind === "icon") return 0;
      if (asset.assetKind === "artwork") return 1;
    }
    return 2;
  };
  addPinnedAsset({
    assetId: iconAssetId,
    assetName: iconAssetName,
    assetsById,
    pinnedIds,
    pinnedAssets,
  });

  const rankedAssets = normalizedQuery
    ? assets
        .map((asset) => {
          const nameLower = asset.name.toLowerCase();
          if (!nameLower.includes(normalizedQuery)) return null;
          const words = nameLower.split(/[^a-z0-9]+/i).filter(Boolean);
          const isPrefix = words.some((word) => word.startsWith(normalizedQuery));
          return { asset, score: isPrefix ? 0 : 1 };
        })
        .filter(
          (entry): entry is { asset: AssetRecord; score: number } => entry !== null,
        )
        .sort((a, b) => {
          if (a.score !== b.score) return a.score - b.score;
          const rankDiff = getAssetRank(a.asset) - getAssetRank(b.asset);
          if (rankDiff !== 0) return rankDiff;
          return a.asset.name.localeCompare(b.asset.name, undefined, { sensitivity: "base" });
        })
        .map((entry) => entry.asset)
    : [];

  const cappedAssets =
    normalizedQuery.length < 4 ? rankedAssets.slice(0, 8) : rankedAssets;

  const positionPopover = () => {
    const anchor = adjustmentsButtonRef.current;
    const popover = adjustmentsPopoverRef.current;
    if (!anchor || !popover) return;

    const anchorRect = anchor.getBoundingClientRect();
    const padding = 12;
    const offset = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceLeft = anchorRect.left - padding - offset;
    const clampedWidth = Math.max(240, Math.min(520, spaceLeft));
    popover.style.width = `${clampedWidth}px`;

    const { width, height } = popover.getBoundingClientRect();

    const left = Math.max(anchorRect.left - width - offset, padding);
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    let top = anchorCenterY;
    top = Math.min(Math.max(top, padding + height / 2), viewportHeight - padding - height / 2);

    setAdjustmentsStyle({ left, top });
  };

  useLayoutEffect(() => {
    if (!isAdjustmentsOpen) return;
    if (typeof window === "undefined") return;

    const updatePosition = () => {
      positionPopover();
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isAdjustmentsOpen]);

  return (
    <div className="mb-2">
      <div className={layoutStyles.inspectorFieldHeader}>
        <FormLabelWithIcon label={label} icon={Image} className="form-label" />
      </div>
      <div ref={inputWrapRef} className={layoutStyles.imageAutocompleteWrap}>
        <div className="input-group input-group-sm">
          <span className={`input-group-text ${layoutStyles.imageSearchAddon}`}>
            <Search className={layoutStyles.icon} aria-hidden="true" />
          </span>
          <input
            type="text"
            ref={inputRef}
            className={`form-control ${layoutStyles.imageHeaderStatus} ${
              iconAssetId ? "" : layoutStyles.imageHeaderStatusMissing
            }`}
            value={isEditing ? query : currentDisplayValue}
            placeholder={t("placeholders.searchAssets")}
            onFocus={() => {
              setIsEditing(true);
              setQuery("");
              setIsDropdownOpen(true);
            }}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              setIsDropdownOpen(true);
            }}
            onBlur={() => {
              if (isEditing) {
                resetSearchState();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                resetSearchState();
              }
              if (event.key === "Enter" && query.trim().length === 0) {
                event.preventDefault();
                resetSearchState();
              }
            }}
            title={iconAssetId ? (iconAssetName ?? iconAssetId) : t("status.noIconSelected")}
          />
        <IconButton
          className="btn btn-outline-secondary btn-sm"
          icon={ImagePlus}
          title={t("tooltip.openIconPicker")}
          onClick={() => {
            picker.open();
          }}
        >
          {t("actions.chooseImage")}
        </IconButton>
        <IconButton
          className="btn btn-outline-secondary btn-sm"
          icon={SlidersHorizontal}
          title={t("form.imageAdjustments")}
          disabled={!iconAssetId}
          buttonRef={adjustmentsButtonRef}
          iconOnly
          onClick={() => {
            setIsAdjustmentsOpen((prev) => {
              const next = !prev;
              if (next) {
                requestAnimationFrame(() => {
                  positionPopover();
                });
              }
              return next;
            });
          }}
        >
          <span className="visually-hidden">{t("form.imageAdjustments")}</span>
        </IconButton>
        {iconAssetId ? (
          <IconButton
            className="btn btn-outline-secondary btn-sm"
            icon={XCircle}
            title={t("tooltip.clearSelectedIcon")}
            onClick={() => {
              if (iconAssetId) {
                setLastCleared({
                  id: iconAssetId,
                  name: iconAssetName,
                });
              }
              setValue("iconAssetId", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("iconAssetName", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("iconOffsetX", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("iconOffsetY", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("iconScale", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("iconRotation", undefined, { shouldDirty: true, shouldTouch: true });
            }}
          >
            <span className="visually-hidden">{t("actions.clear")}</span>
          </IconButton>
        ) : lastCleared ? (
          <IconButton
            className="btn btn-outline-secondary btn-sm"
            icon={RotateCcw}
            title={t("tooltip.restoreSelectedImage")}
            onClick={() => {
              handleRestoreLastCleared();
            }}
          >
            <span className="visually-hidden">{t("actions.restore")}</span>
          </IconButton>
          ) : null}
        </div>
        {isDropdownOpen ? (
          <div
            ref={dropdownRef}
            className={layoutStyles.imageAutocompleteList}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
          >
            {pinnedAssets.length === 0 && (!normalizedQuery || cappedAssets.length === 0) ? (
              <div className={layoutStyles.imageAutocompleteEmpty}>{t("empty.noAssets")}</div>
            ) : (
              <>
                {normalizedQuery
                  ? cappedAssets
                      .filter((asset) => !pinnedIds.has(asset.id))
                      .map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          className={layoutStyles.imageAutocompleteItem}
                          onClick={() => {
                            applyAssetSelection(asset);
                            resetSearchState();
                            inputRef.current?.blur();
                          }}
                        >
                          <div className={layoutStyles.imageAutocompleteMarker} aria-hidden="true" />
                          <div className={layoutStyles.imageAutocompleteThumb}>
                            {thumbUrls[asset.id] ? <img src={thumbUrls[asset.id]} alt="" /> : null}
                          </div>
                          <div className={layoutStyles.imageAutocompleteName} title={asset.name}>
                            {asset.name}
                          </div>
                          <span
                            className={`${layoutStyles.imageAutocompleteKind} ${
                              asset.assetKindStatus === "classified"
                                ? asset.assetKind === "icon"
                                  ? layoutStyles.imageAutocompleteKindIcon
                                  : layoutStyles.imageAutocompleteKindArtwork
                                : layoutStyles.imageAutocompleteKindUnknown
                            }`}
                          >
                            {getAssetKindLabel(t, asset)}
                          </span>
                        </button>
                      ))
                  : null}
                {pinnedAssets.map((asset) => (
                  <button
                    key={`pinned-${asset.id}`}
                    type="button"
                    className={layoutStyles.imageAutocompleteItem}
                    onClick={() => {
                      applyAssetSelection(asset);
                      resetSearchState();
                      inputRef.current?.blur();
                    }}
                  >
                    <div className={layoutStyles.imageAutocompleteMarker} aria-hidden="true">
                      <Pin className={layoutStyles.icon} aria-hidden="true" />
                    </div>
                    <div className={layoutStyles.imageAutocompleteThumb}>
                      {thumbUrls[asset.id] ? <img src={thumbUrls[asset.id]} alt="" /> : null}
                    </div>
                    <div className={layoutStyles.imageAutocompleteName} title={asset.name}>
                      {asset.name}
                    </div>
                    <span
                      className={`${layoutStyles.imageAutocompleteKind} ${
                        asset.assetKindStatus === "classified"
                          ? asset.assetKind === "icon"
                            ? layoutStyles.imageAutocompleteKindIcon
                            : layoutStyles.imageAutocompleteKindArtwork
                          : layoutStyles.imageAutocompleteKindUnknown
                      }`}
                    >
                      {getAssetKindLabel(t, asset)}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        ) : null}
      </div>
      {fieldError ? (
        <div className="form-text text-danger">
          {String(fieldError.message ?? t("errors.invalidValue"))}
        </div>
      ) : null}
      {isAdjustmentsOpen && iconAssetId && isClient
        ? createPortal(
            <div
              ref={adjustmentsPopoverRef}
              className={layoutStyles.imageAdjustmentsPopover}
              style={adjustmentsStyle ?? undefined}
            >
              <div className={layoutStyles.imageAdjustmentsPopoverContent}>
                <div className={layoutStyles.imageControlGroup}>
                  <div className={layoutStyles.imageControlLabelRow}>
                    <label className="form-label mb-1">{t("form.horizontalPosition")}</label>
                  </div>
                  <div className={`${layoutStyles.imageControlRow} input-group input-group-sm`}>
                    <input
                      type="range"
                      className={`${layoutStyles.imageControlRange} flex-grow-1`}
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(iconOffsetX * 100)}
                      title={t("tooltip.adjustHorizontal")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("iconOffsetX", clamp(next / 100, 0, 1), {
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.nudgeLeft")}
                      onClick={() => {
                        setValue("iconOffsetX", clamp(iconOffsetX - 0.01, 0, 1), {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ChevronLeft className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.nudgeRight")}
                      onClick={() => {
                        setValue("iconOffsetX", clamp(iconOffsetX + 0.01, 0, 1), {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ChevronRight className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.centerHorizontal")}
                      onClick={() => {
                        setValue("iconOffsetX", 0, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <Crosshair className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                  </div>
                  <div className={layoutStyles.imageControlLabelRow}>
                    <label className="form-label mb-1">{t("form.verticalPosition")}</label>
                  </div>
                  <div className={`${layoutStyles.imageControlRow} input-group input-group-sm`}>
                    <input
                      type="range"
                      className={`${layoutStyles.imageControlRange} flex-grow-1`}
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(iconOffsetY * 100)}
                      title={t("tooltip.adjustVertical")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("iconOffsetY", clamp(next / 100, 0, 1), {
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.nudgeUp")}
                      onClick={() => {
                        setValue("iconOffsetY", clamp(iconOffsetY + 0.01, 0, 1), {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ChevronUp className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.nudgeDown")}
                      onClick={() => {
                        setValue("iconOffsetY", clamp(iconOffsetY - 0.01, 0, 1), {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ChevronDown className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.centerVertical")}
                      onClick={() => {
                        setValue("iconOffsetY", 0, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <Crosshair className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                  </div>
                  <div className={layoutStyles.imageControlLabelRow}>
                    <label className="form-label mb-1">{t("form.scale")}</label>
                  </div>
                  <div className={`${layoutStyles.imageControlRow} input-group input-group-sm`}>
                    <input
                      type="range"
                      className={`${layoutStyles.imageControlRange} flex-grow-1`}
                      min={MIN_SCALE}
                      max={MAX_SCALE}
                      step={SCALE_STEP}
                      value={iconScale}
                      title={t("tooltip.adjustScale")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("iconScale", clamp(next, MIN_SCALE, MAX_SCALE), {
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.zoomOut")}
                      onClick={() => {
                        const next = clamp(iconScale - SCALE_STEP, MIN_SCALE, MAX_SCALE);
                        setValue("iconScale", next, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ZoomOut className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.zoomIn")}
                      onClick={() => {
                        const next = clamp(iconScale + SCALE_STEP, MIN_SCALE, MAX_SCALE);
                        setValue("iconScale", next, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ZoomIn className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.autoScale")}
                      onClick={() => {
                        setValue("iconScale", 1, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <RotateCcw className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                  </div>
                  <div className={layoutStyles.imageControlLabelRow}>
                    <label className="form-label mb-1">{t("form.rotation")}</label>
                  </div>
                  <div className={`${layoutStyles.imageControlRow} input-group input-group-sm`}>
                    <input
                      type="range"
                      className={`${layoutStyles.imageControlRange} flex-grow-1`}
                      min={MIN_ROTATION}
                      max={MAX_ROTATION}
                      step={ROTATION_STEP}
                      value={iconRotation}
                      title={t("tooltip.adjustRotation")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("iconRotation", next, {
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.rotateLeft")}
                      onClick={() => {
                        const next = clamp(iconRotation - ROTATION_STEP, MIN_ROTATION, MAX_ROTATION);
                        setValue("iconRotation", next, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ChevronLeft className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.rotateRight")}
                      onClick={() => {
                        const next = clamp(iconRotation + ROTATION_STEP, MIN_ROTATION, MAX_ROTATION);
                        setValue("iconRotation", next, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <ChevronRight className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.resetRotation")}
                      onClick={() => {
                        setValue("iconRotation", 0, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <RotateCcw className={layoutStyles.icon} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
        <AssetsModal
          isOpen={picker.isOpen}
          onClose={picker.close}
          mode="select"
          onSelect={(asset) => {
            setValue("iconAssetId", asset.id, { shouldDirty: true, shouldTouch: true });
            setValue("iconAssetName", asset.name, { shouldDirty: true, shouldTouch: true });
            setLastCleared(null);
          }}
          preferredKindOrder={["icon"]}
        />
    </div>
  );
}
