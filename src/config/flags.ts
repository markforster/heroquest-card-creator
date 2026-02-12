/**
 * Enables ZIP compression for exports. Used by backup/export flows in src/lib/backup.ts
 * and Stockpile modal bulk export. When false, ZIPs are stored without compression.
 */
export const USE_ZIP_COMPRESSION = true;

/**
 * Forces the WebGL renderer as the active preview renderer via PreviewRendererContext.
 * When true, PreviewRendererContext sets the renderer to "webgl" and ignores localStorage
 * toggles. Used in PreviewRendererContext.
 */
export const USE_WEBGL_PREVIEW = false;

/**
 * Controls whether the preview renderer toggle (SVG/WebGL) is shown in ToolsToolbar.
 * Used in PreviewRendererContext flags and ToolsToolbar to gate the toggle UI.
 */
export const SHOW_WEBGL_TOGGLE = true;

/**
 * Controls whether WebGL sheen/lighting controls are shown (if wired). This flag is
 * consumed by Webgl preview UI components to gate additional controls.
 */
export const SHOW_WEBGL_SHEEN_CONTROLS = false;

/**
 * Keeps the WebGL preview mounted even when SVG is selected, hiding it via CSS instead
 * of unmounting. Used in CardPreviewContainer to reduce flicker when switching renderers.
 */
export const KEEP_WEBGL_MOUNTED = true;

/**
 * When enabled, selecting a mini card or switching faces triggers a WebGL recenter.
 * This is used to keep the recenter path in place without forcing the behavior.
 */
export const ENABLE_WEBGL_RECENTER_ON_FACE_SELECT = false;

/**
 * Selects the overlay shader for the WebGL blueprint back face.
 */
export const WEBGL_BLUEPRINT_OVERLAY_MODE: "off" | "magic" | "sparkle" = "sparkle";

/**
 * Applies tighter letter-spacing to title and stat header text to better match
 * printed card ink density.
 */
export const USE_TIGHTER_TITLE_TRACKING = true;

/**
 * Uses bold weight for the ribbon title text to better match printed cards.
 */
export const USE_BOLD_TITLE_WEIGHT = true;

/**
 * Applies a subtle vertical scale to title text to mimic printed compression.
 */
export const USE_TITLE_VERTICAL_COMPRESSION = true;

/**
 * Vertical scale factor when USE_TITLE_VERTICAL_COMPRESSION is enabled.
 */
export const TITLE_VERTICAL_SCALE_Y = 0.98;

/**
 * Toggles the dark title stroke that was used to boost perceived weight.
 */
export const USE_TITLE_STROKE = true;

/**
 * When the ribbon is hidden, use a lighter title weight for A/B testing.
 */
export const USE_LIGHTER_NONRIBBON_TITLE_WEIGHT = false;

/**
 * Lighter weight to use when USE_LIGHTER_NONRIBBON_TITLE_WEIGHT is enabled.
 */
export const NONRIBBON_TITLE_WEIGHT = 550;

/**
 * Applies tighter letter-spacing to stat headers.
 */
export const USE_TIGHTER_STATS_TRACKING = false;

/**
 * Applies a subtle vertical scale to stats text to mimic printed compression.
 */
export const USE_STATS_VERTICAL_COMPRESSION = false;

/**
 * Vertical scale factor when USE_STATS_VERTICAL_COMPRESSION is enabled.
 */
export const STATS_VERTICAL_SCALE_Y = 0.985;

/**
 * Adds subtle rotation/offset jitter to paired export preview cards in the Stockpile modal.
 */
export const USE_EXPORT_PAIR_JITTER = false;
