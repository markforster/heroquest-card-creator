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
