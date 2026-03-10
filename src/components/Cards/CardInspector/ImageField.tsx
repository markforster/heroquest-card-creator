"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Image,
  ImagePlus,
  Search,
  RotateCcw,
  SlidersHorizontal,
  XCircle,
  ZoomIn,
  ZoomOut,
  Pin,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFormContext, useWatch } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { AssetsModal } from "@/components/Assets";
import { addPinnedAsset, getAssetKindLabel } from "@/components/Cards/CardInspector/asset-utils";
import FormLabelWithIcon from "@/components/Cards/CardInspector/FormLabelWithIcon";
import IconButton from "@/components/common/IconButton";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { usePopupState } from "@/hooks/usePopupState";
import { useI18n } from "@/i18n/I18nProvider";
import { apiClient } from "@/api/client";
import type { AssetRecord } from "@/api/assets";
import {
  computeSliderTickLeftPx,
  computeImageZoomModel,
  IMAGE_SCALE_SLIDER_THUMB_SIZE_PX,
  LEGACY_ABSOLUTE_IMAGE_SCALE_MAX,
  LEGACY_ABSOLUTE_IMAGE_SCALE_MIN,
  mapRelativeScaleToUiZoom,
  mapUiZoomToRelativeScale,
  normalizeLegacyImageScale,
  UI_ZOOM_BUTTON_STEP,
  UI_ZOOM_SLIDER_STEP,
} from "@/lib/image-scale";
import { clamp } from "@/lib/math";

import type { CSSProperties } from "react";

type ImageFieldProps = {
  label: string;
  boundsWidth?: number;
  boundsHeight?: number;
};

type ImageSnapshot = {
  imageAssetId?: string;
  imageAssetName?: string;
  imageOriginalWidth?: number;
  imageOriginalHeight?: number;
  imageScale?: number;
  imageScaleMode?: "absolute" | "relative";
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageRotation?: number;
};

export default function ImageField({ label, boundsWidth, boundsHeight }: ImageFieldProps) {
  const { t } = useI18n();
  const {
    setValue,
    formState: { errors },
  } = useFormContext();
  const imageAssetId = useWatch({ name: "imageAssetId" }) as string | undefined;
  const imageAssetNameWatch = useWatch({ name: "imageAssetName" }) as string | undefined;
  const imageOriginalWidthWatch = useWatch({
    name: "imageOriginalWidth",
  }) as number | undefined;
  const imageOriginalHeightWatch = useWatch({
    name: "imageOriginalHeight",
  }) as number | undefined;
  const imageScaleWatch = useWatch({ name: "imageScale" }) as number | undefined;
  const imageScaleModeWatch = useWatch({ name: "imageScaleMode" }) as
    | "absolute"
    | "relative"
    | undefined;
  const imageOffsetXWatch = useWatch({ name: "imageOffsetX" }) as number | undefined;
  const imageOffsetYWatch = useWatch({ name: "imageOffsetY" }) as number | undefined;
  const imageRotationWatch = useWatch({ name: "imageRotation" }) as number | undefined;
  const picker = usePopupState(false);

  const fieldError = (errors as Record<string, { message?: string }>).imageAssetId;
  const imageAssetName = imageAssetNameWatch;
  const currentDisplayValue = imageAssetId
    ? (imageAssetName ?? t("status.imageSelected"))
    : t("status.noImageSelected");

  const imageScale = imageScaleWatch ?? 1;
  const imageScaleMode = imageScaleModeWatch ?? "relative";
  const imageOffsetX = imageOffsetXWatch ?? 0;
  const imageOffsetY = imageOffsetYWatch ?? 0;
  const imageRotation = imageRotationWatch ?? 0;
  const imageOriginalWidth = imageOriginalWidthWatch;
  const imageOriginalHeight = imageOriginalHeightWatch;
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
  const inputWrapRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previousImageRef = useRef<ImageSnapshot | null>(null);
  const scaleSliderRef = useRef<HTMLInputElement | null>(null);
  const [scaleSliderWidthPx, setScaleSliderWidthPx] = useState(0);

  const maxOffsetX = boundsWidth ? Math.round(boundsWidth) : 300;
  const maxOffsetY = boundsHeight ? Math.round(boundsHeight) : 300;

  const SCALE_STEP = 0.05;
  const MIN_ROTATION = -180;
  const MAX_ROTATION = 180;
  const ROTATION_STEP = 1;

  const imageBounds = useMemo(
    () =>
      boundsWidth && boundsHeight
        ? { x: 0, y: 0, width: boundsWidth, height: boundsHeight }
        : undefined,
    [boundsWidth, boundsHeight],
  );

  useEffect(() => {
    if (imageScaleModeWatch !== "absolute") return;
    const normalized = normalizeLegacyImageScale({
      imageScale: imageScaleWatch,
      imageScaleMode: undefined,
      bounds: imageBounds,
      imageWidth: imageOriginalWidthWatch,
      imageHeight: imageOriginalHeightWatch,
    });
    if (normalized.imageScaleMode !== "relative") return;
    setValue("imageScale", normalized.imageScale, { shouldDirty: false, shouldTouch: false });
    setValue("imageScaleMode", "relative", { shouldDirty: false, shouldTouch: false });
  }, [
    imageBounds,
    imageOriginalHeightWatch,
    imageOriginalWidthWatch,
    imageScaleModeWatch,
    imageScaleWatch,
    setValue,
  ]);

  const zoomModel =
    imageScaleMode === "relative"
      ? computeImageZoomModel(imageBounds, imageOriginalWidth, imageOriginalHeight)
      : undefined;
  const minScale =
    imageScaleMode === "relative"
      ? zoomModel?.relativeMin ?? LEGACY_ABSOLUTE_IMAGE_SCALE_MIN
      : LEGACY_ABSOLUTE_IMAGE_SCALE_MIN;
  const maxScale =
    imageScaleMode === "relative"
      ? zoomModel?.relativeMax ?? LEGACY_ABSOLUTE_IMAGE_SCALE_MAX
      : LEGACY_ABSOLUTE_IMAGE_SCALE_MAX;
  const sliderMin = imageScaleMode === "relative" ? zoomModel?.uiMin ?? 1 : minScale;
  const sliderMax = imageScaleMode === "relative" ? zoomModel?.uiMax ?? 3 : maxScale;
  const sliderStep = imageScaleMode === "relative" ? UI_ZOOM_SLIDER_STEP : SCALE_STEP;
  const sliderValue =
    imageScaleMode === "relative" && zoomModel
      ? mapRelativeScaleToUiZoom(imageScale, zoomModel)
      : imageScale;
  const zoomTicksId =
    imageScaleMode === "relative" ? `image-scale-ticks-${imageAssetId ?? "none"}` : undefined;
  const coverScaleTick =
    imageScaleMode === "relative" && zoomModel && zoomModel.relativeCover >= sliderMin && zoomModel.relativeCover <= sliderMax
      ? { value: zoomModel.relativeCover, label: "Cover", id: "cover", emphasize: true }
      : null;
  const customScaleTicks =
    imageScaleMode === "relative" && zoomModel
      ? [
          { value: sliderMin, label: `${sliderMin.toFixed(1)}x`, id: "min" },
          { value: 1, label: "1x", id: "1x", emphasize: true },
          { value: 2, label: "2x", id: "2x" },
          { value: 3, label: "3x", id: "3x" },
          { value: sliderMax, label: "max", id: "max" },
        ].filter((tick, index, all) => {
          return (
            all.findIndex((candidate) => Math.abs(candidate.value - tick.value) < 1e-6) === index
          );
        })
      : [];
  const coverScaleTickLeftPx = coverScaleTick
    ? computeSliderTickLeftPx(
        coverScaleTick.value,
        sliderMin,
        sliderMax,
        scaleSliderWidthPx,
        IMAGE_SCALE_SLIDER_THUMB_SIZE_PX,
      )
    : 0;

  const getCurrentSnapshot = useCallback(
    (): ImageSnapshot => ({
      imageAssetId,
      imageAssetName,
      imageOriginalWidth,
      imageOriginalHeight,
      imageScale,
      imageScaleMode,
      imageOffsetX,
      imageOffsetY,
      imageRotation,
    }),
    [
      imageAssetId,
      imageAssetName,
      imageOriginalWidth,
      imageOriginalHeight,
      imageScale,
      imageScaleMode,
      imageOffsetX,
      imageOffsetY,
      imageRotation,
    ],
  );

  const capturePreviousImageState = () => {
    previousImageRef.current = getCurrentSnapshot();
  };

  const computeAutoScale = () => {
    return 1;
  };

  const applyAssetSelection = (asset: AssetRecord) => {
    capturePreviousImageState();
    setValue("imageAssetId", asset.id, { shouldDirty: true, shouldTouch: true });
    setValue("imageAssetName", asset.name, { shouldDirty: true, shouldTouch: true });
    setValue("imageRotation", 0, { shouldDirty: true, shouldTouch: true });

    setValue("imageScale", 1, { shouldDirty: true, shouldTouch: true });
    setValue("imageScaleMode", "relative", { shouldDirty: true, shouldTouch: true });
    if (asset.width && asset.height) {
      const aw = asset.width;
      const ah = asset.height;
      setValue("imageOriginalWidth", aw, { shouldDirty: true, shouldTouch: true });
      setValue("imageOriginalHeight", ah, { shouldDirty: true, shouldTouch: true });
    }
    setValue("imageOffsetX", 0, { shouldDirty: true, shouldTouch: true });
    setValue("imageOffsetY", 0, { shouldDirty: true, shouldTouch: true });
  };

  const handleSelect = (asset: AssetRecord) => {
    applyAssetSelection(asset);
    picker.close();
  };

  const handleRestorePreviousImage = () => {
    if (!previousImageRef.current) return;
    const previous = previousImageRef.current;
    setValue("imageAssetId", previous.imageAssetId, { shouldDirty: true, shouldTouch: true });
    setValue("imageAssetName", previous.imageAssetName, { shouldDirty: true, shouldTouch: true });
    setValue("imageOriginalWidth", previous.imageOriginalWidth, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue("imageOriginalHeight", previous.imageOriginalHeight, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue("imageScale", previous.imageScale, { shouldDirty: true, shouldTouch: true });
    setValue("imageScaleMode", previous.imageScaleMode, { shouldDirty: true, shouldTouch: true });
    setValue("imageOffsetX", previous.imageOffsetX, { shouldDirty: true, shouldTouch: true });
    setValue("imageOffsetY", previous.imageOffsetY, { shouldDirty: true, shouldTouch: true });
    setValue("imageRotation", previous.imageRotation, { shouldDirty: true, shouldTouch: true });
    resetSearchState();
  };

  useEffect(() => {
    if (!imageAssetId) {
      setIsAdjustmentsOpen(false);
    }
  }, [imageAssetId]);

  useOutsideClick(
    [adjustmentsPopoverRef, adjustmentsButtonRef],
    () => setIsAdjustmentsOpen(false),
    isAdjustmentsOpen,
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  const resetSearchState = () => {
    setIsDropdownOpen(false);
    setIsEditing(false);
    setQuery("");
  };

  useOutsideClick([inputWrapRef, dropdownRef], resetSearchState, isDropdownOpen);

  useEffect(() => {
    if (!previousImageRef.current) {
      previousImageRef.current = getCurrentSnapshot();
    }
  }, [
    imageAssetId,
    imageAssetName,
    imageOriginalWidth,
    imageOriginalHeight,
    imageScale,
    imageScaleMode,
    imageOffsetX,
    imageOffsetY,
    imageRotation,
    getCurrentSnapshot,
  ]);

  useEffect(() => {
    if (!isEditing) return;

    let cancelled = false;

    apiClient.listAssets()
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
          const url = await apiClient.getAssetObjectUrl({
            params: { id: asset.id },
          });
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
      if (asset.assetKind === "artwork") return 0;
      if (asset.assetKind === "icon") return 1;
    }
    return 2;
  };
  addPinnedAsset({
    assetId: imageAssetId,
    assetName: imageAssetName,
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
  const previousImageId = previousImageRef.current?.imageAssetId;
  const canRestorePrevious = previousImageRef.current
    ? (imageAssetId ?? "") !== (previousImageId ?? "")
    : false;

  const positionPopover = () => {
    const anchor = adjustmentsButtonRef.current;
    const popover = adjustmentsPopoverRef.current;
    if (!anchor || !popover) return;

    const anchorRect = anchor.getBoundingClientRect();
    const padding = 12;
    const offset = 8;
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

  useLayoutEffect(() => {
    const sliderEl = scaleSliderRef.current;
    if (!sliderEl) return;

    const measure = () => {
      const rect = sliderEl.getBoundingClientRect();
      const width = Number.isFinite(rect.width) && rect.width > 0 ? rect.width : sliderEl.clientWidth;
      setScaleSliderWidthPx(width > 0 ? width : 0);
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => measure());
      observer.observe(sliderEl);
      return () => observer.disconnect();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    return undefined;
  }, [isAdjustmentsOpen, sliderMin, sliderMax, imageScaleMode]);

  return (
    <div className="mb-2">
      <div className={layoutStyles.inspectorFieldHeader}>
        <FormLabelWithIcon label={label} icon={Image} className="form-label" />
      </div>
      <div ref={inputWrapRef} className={layoutStyles.imageAutocompleteWrap}>
        <div className="input-group input-group-sm mb-2">
          <span className={`input-group-text ${layoutStyles.imageSearchAddon}`}>
            <Search className={layoutStyles.icon} aria-hidden="true" />
          </span>
          <input
            type="text"
            ref={inputRef}
            className={`form-control ${layoutStyles.imageHeaderStatus} ${
              imageAssetId ? "" : layoutStyles.imageHeaderStatusMissing
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
            title={imageAssetId ? (imageAssetName ?? imageAssetId) : undefined}
          />
          <IconButton
            className="btn btn-outline-secondary btn-sm"
            icon={ImagePlus}
            title={t("tooltip.openImagePicker")}
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
            disabled={!imageAssetId}
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
          {canRestorePrevious ? (
            <IconButton
              className="btn btn-outline-secondary btn-sm"
              icon={RotateCcw}
              title={t("tooltip.restoreSelectedImage")}
              onClick={() => {
                handleRestorePreviousImage();
              }}
            >
              <span className="visually-hidden">{t("actions.restore")}</span>
            </IconButton>
          ) : imageAssetId ? (
            <IconButton
              className="btn btn-outline-secondary btn-sm"
              icon={XCircle}
              title={t("tooltip.clearSelectedImage")}
              onClick={() => {
                capturePreviousImageState();
                setValue("imageAssetId", undefined, { shouldDirty: true, shouldTouch: true });
                setValue("imageAssetName", undefined, { shouldDirty: true, shouldTouch: true });
                setValue("imageScale", undefined, { shouldDirty: true, shouldTouch: true });
                setValue("imageScaleMode", undefined, { shouldDirty: true, shouldTouch: true });
                setValue("imageOriginalWidth", undefined, { shouldDirty: true, shouldTouch: true });
                setValue("imageOriginalHeight", undefined, { shouldDirty: true, shouldTouch: true });
                setValue("imageOffsetX", undefined, { shouldDirty: true, shouldTouch: true });
                setValue("imageOffsetY", undefined, { shouldDirty: true, shouldTouch: true });
                setValue("imageRotation", undefined, { shouldDirty: true, shouldTouch: true });
              }}
            >
              <span className="visually-hidden">{t("actions.clear")}</span>
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
                            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
      {isAdjustmentsOpen && imageAssetId && isClient
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
                      min={-maxOffsetX}
                      max={maxOffsetX}
                      step={1}
                      value={imageOffsetX}
                      title={t("tooltip.adjustHorizontal")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("imageOffsetX", next, {
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
                        setValue("imageOffsetX", imageOffsetX - 1, {
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
                        setValue("imageOffsetX", imageOffsetX + 1, {
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
                        setValue("imageOffsetX", 0, {
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
                      min={-maxOffsetY}
                      max={maxOffsetY}
                      step={1}
                      value={imageOffsetY}
                      title={t("tooltip.adjustVertical")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("imageOffsetY", next, {
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
                        setValue("imageOffsetY", imageOffsetY - 1, {
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
                        setValue("imageOffsetY", imageOffsetY + 1, {
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
                        setValue("imageOffsetY", 0, {
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
                    <div className={layoutStyles.imageScaleControlWrap}>
                      {coverScaleTick ? (
                        <div
                          className={`${layoutStyles.imageScaleTicks} ${layoutStyles.imageScaleTicksTop}`}
                          aria-hidden="true"
                        >
                          <div
                            className={`${layoutStyles.imageScaleTick} ${layoutStyles.imageScaleTickTop} ${layoutStyles.imageScaleTickStrong}`}
                            style={{ left: `${coverScaleTickLeftPx}px` }}
                            data-testid="image-scale-tick-cover"
                          >
                            <span className={layoutStyles.imageScaleTickLine} />
                            <span className={layoutStyles.imageScaleTickLabel}>
                              {coverScaleTick.label}
                            </span>
                          </div>
                        </div>
                      ) : null}
                      <input
                        ref={scaleSliderRef}
                        type="range"
                        className={`${layoutStyles.imageControlRange} flex-grow-1`}
                        style={
                          {
                            "--image-range-thumb-size": `${IMAGE_SCALE_SLIDER_THUMB_SIZE_PX}px`,
                          } as CSSProperties
                        }
                        min={sliderMin}
                        max={sliderMax}
                        step={sliderStep}
                        value={sliderValue}
                        list={zoomTicksId}
                        title={t("tooltip.adjustScale")}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (!Number.isNaN(next)) {
                            const nextScale =
                              imageScaleMode === "relative" && zoomModel
                                ? mapUiZoomToRelativeScale(next, zoomModel)
                                : next;
                            setValue("imageScale", clamp(nextScale, minScale, maxScale), {
                              shouldDirty: true,
                              shouldTouch: true,
                            });
                          }
                        }}
                      />
                      {zoomTicksId ? (
                        <datalist id={zoomTicksId}>
                          <option value={sliderMin} />
                          <option value={1} />
                          <option value={2} />
                          <option value={3} />
                          <option value={zoomModel?.relativeCover ?? sliderMax} />
                          <option value={sliderMax} />
                        </datalist>
                      ) : null}
                      {customScaleTicks.length ? (
                        <div className={layoutStyles.imageScaleTicks} aria-hidden="true">
                          {customScaleTicks.map((tick, index) => {
                            const leftPx = computeSliderTickLeftPx(
                              tick.value,
                              sliderMin,
                              sliderMax,
                              scaleSliderWidthPx,
                              IMAGE_SCALE_SLIDER_THUMB_SIZE_PX,
                            );
                            const positionClass =
                              index === 0
                                ? layoutStyles.imageScaleTickStart
                                : index === customScaleTicks.length - 1
                                  ? layoutStyles.imageScaleTickEnd
                                  : "";
                            return (
                              <div
                                key={`${tick.id}-${index}`}
                                className={`${layoutStyles.imageScaleTick} ${positionClass} ${
                                  tick.emphasize ? layoutStyles.imageScaleTickStrong : ""
                                }`}
                                style={{ left: `${leftPx}px` }}
                                data-testid={`image-scale-tick-${tick.id}`}
                              >
                                <span className={layoutStyles.imageScaleTickLine} />
                                <span className={layoutStyles.imageScaleTickLabel}>{tick.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className={`${layoutStyles.imageControlButton} btn btn-outline-secondary btn-sm`}
                      title={t("tooltip.zoomOut")}
                      onClick={() => {
                        const next =
                          imageScaleMode === "relative" && zoomModel
                            ? mapUiZoomToRelativeScale(
                                clamp(sliderValue - UI_ZOOM_BUTTON_STEP, sliderMin, sliderMax),
                                zoomModel,
                              )
                            : clamp(imageScale - SCALE_STEP, minScale, maxScale);
                        setValue("imageScale", next, {
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
                        const next =
                          imageScaleMode === "relative" && zoomModel
                            ? mapUiZoomToRelativeScale(
                                clamp(sliderValue + UI_ZOOM_BUTTON_STEP, sliderMin, sliderMax),
                                zoomModel,
                              )
                            : clamp(imageScale + SCALE_STEP, minScale, maxScale);
                        setValue("imageScale", next, {
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
                        const auto = computeAutoScale();
                        const next = clamp(auto, minScale, maxScale);
                        setValue("imageScale", next, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                        setValue("imageScaleMode", "relative", {
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
                      value={imageRotation}
                      title={t("tooltip.adjustRotation")}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (!Number.isNaN(next)) {
                          setValue("imageRotation", next, {
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
                        const next = clamp(imageRotation - ROTATION_STEP, MIN_ROTATION, MAX_ROTATION);
                        setValue("imageRotation", next, {
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
                        const next = clamp(imageRotation + ROTATION_STEP, MIN_ROTATION, MAX_ROTATION);
                        setValue("imageRotation", next, {
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
                        setValue("imageRotation", 0, {
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
        onSelect={handleSelect}
        preferredKindOrder={["artwork"]}
      />
    </div>
  );
}
