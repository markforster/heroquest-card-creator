"use client";

type ExportMode = "single" | "bulk";

export type ExportLoggingSession = {
  sessionId: string;
  startedAt: number;
  startedLabel: string;
  mode: ExportMode;
  totalCards: number;
};

type CardAssetInfo = {
  id?: string | null;
  name?: string | null;
};

let exportSessionCounter = 0;
const exportSessions = new Map<string, ExportLoggingSession>();

const formatTime = (date: Date) => date.toLocaleString();

const formatDuration = (value: number) => Math.max(0, Math.round(value));

const safeValue = (value: string | null | undefined, fallback = "unknown") =>
  value && value.trim() ? value : fallback;

const LOG_PREFIX = "[HQCC Export]";

export function startExportLogging({
  mode,
  totalCards,
}: {
  mode: ExportMode;
  totalCards: number;
}): ExportLoggingSession {
  const startedAt = Date.now();
  const startedLabel = formatTime(new Date(startedAt));
  exportSessionCounter += 1;
  const sessionId = `${startedAt}-${exportSessionCounter}`;
  const session: ExportLoggingSession = {
    sessionId,
    startedAt,
    startedLabel,
    mode,
    totalCards,
  };
  exportSessions.set(sessionId, session);
  console.groupCollapsed(
    `${LOG_PREFIX} Export @ ${startedLabel} | mode=${mode} | cards=${totalCards}`,
  );
  return session;
}

export function endExportLogging(session: ExportLoggingSession): void {
  console.groupEnd();
  exportSessions.delete(session.sessionId);
}

export function logDeviceInfo(session: ExportLoggingSession): void {
  if (!exportSessions.has(session.sessionId)) return;
  const platform =
    typeof navigator !== "undefined" ? safeValue(navigator.platform, "unknown") : "unknown";
  const userAgent =
    typeof navigator !== "undefined" ? safeValue(navigator.userAgent, "unknown") : "unknown";
  console.debug(`${LOG_PREFIX} Device: platform="${platform}" | UA="${userAgent}"`);
}

export function logCardInfo(
  session: ExportLoggingSession,
  {
    cardId,
    title,
    templateId,
    face,
    imageAsset,
    iconAsset,
  }: {
    cardId?: string | null;
    title?: string | null;
    templateId?: string | null;
    face?: string | null;
    imageAsset?: CardAssetInfo;
    iconAsset?: CardAssetInfo;
  },
): void {
  if (!exportSessions.has(session.sessionId)) return;
  const safeCardId = safeValue(cardId, "unknown");
  const safeTitle = safeValue(title, "Untitled");
  const safeTemplate = safeValue(templateId, "unknown");
  const safeFace = safeValue(face, "unknown");
  console.debug(
    `${LOG_PREFIX} Card: id=${safeCardId} | title="${safeTitle}" | template=${safeTemplate} | face=${safeFace}`,
  );

  const imageId = safeValue(imageAsset?.id ?? undefined, "none");
  const imageName = safeValue(imageAsset?.name ?? undefined, "unknown");
  const iconId = safeValue(iconAsset?.id ?? undefined, "none");
  const iconName = safeValue(iconAsset?.name ?? undefined, "unknown");
  console.debug(
    `${LOG_PREFIX} Assets: image=${imageId} ("${imageName}") | icon=${iconId} ("${iconName}")`,
  );
}

export function logCardWait(
  session: ExportLoggingSession,
  { durationMs }: { durationMs: number },
): void {
  if (!exportSessions.has(session.sessionId)) return;
  console.debug(`${LOG_PREFIX} Wait: ${formatDuration(durationMs)}ms`);
}

export function logCardRender(
  session: ExportLoggingSession,
  { durationMs, success }: { durationMs: number; success: boolean },
): void {
  if (!exportSessions.has(session.sessionId)) return;
  console.debug(`${LOG_PREFIX} Render: ${formatDuration(durationMs)}ms | success=${success}`);
}

export function logCardFileName(
  session: ExportLoggingSession,
  {
    cardId,
    fileName,
    wasDeduped,
  }: { cardId?: string | null; fileName: string; wasDeduped: boolean },
): void {
  if (!exportSessions.has(session.sessionId)) return;
  const safeCardId = safeValue(cardId, "unknown");
  console.debug(
    `${LOG_PREFIX} Filename: card=${safeCardId} | name="${fileName}" | deduped=${wasDeduped}`,
  );
}

export function logCardSkip(
  session: ExportLoggingSession,
  { reason }: { reason: string },
): void {
  if (!exportSessions.has(session.sessionId)) return;
  console.debug(`${LOG_PREFIX} Skip: ${safeValue(reason, "unknown")}`);
}

export function logAssetPrefetch(
  session: ExportLoggingSession,
  {
    total,
    cached,
    missing,
  }: {
    total: number;
    cached: number;
    missing: number;
  },
): void {
  if (!exportSessions.has(session.sessionId)) return;
  console.debug(
    `${LOG_PREFIX} Prefetch: total=${total} | cached=${cached} | missing=${missing}`,
  );
}

export function logAssetInlineById(
  loggingId: string | undefined,
  {
    assetId,
    assetName,
    source,
    durationMs,
    outcome,
  }: {
    assetId: string;
    assetName?: string | null;
    source: "userAssetCache" | "userAssetId" | "embedded" | "fetch";
    durationMs: number;
    outcome: "success" | "fail" | "skipped";
  },
): void {
  if (!loggingId) return;
  const session = exportSessions.get(loggingId);
  if (!session) return;
  const nameLabel = safeValue(assetName, "unknown");
  console.debug(
    `${LOG_PREFIX} Asset inline: id=${assetId} | name="${nameLabel}" | source=${source} | duration=${formatDuration(
      durationMs,
    )}ms | outcome=${outcome}`,
  );
}

export function logSummary(
  session: ExportLoggingSession,
  {
    endedAt,
    totalMs,
    cards,
    renders,
    failures,
  }: {
    endedAt: number;
    totalMs: number;
    cards: number;
    renders: number;
    failures: number;
  },
): void {
  if (!exportSessions.has(session.sessionId)) return;
  const endedLabel = formatTime(new Date(endedAt));
  console.debug(
    `${LOG_PREFIX} Summary: started=${session.startedLabel} | ended=${endedLabel} | total=${formatDuration(
      totalMs,
    )}ms | cards=${cards} | renders=${renders} | failures=${failures}`,
  );
}
