export const formatMessage = (
  template: string,
  vars: Record<string, string | number>,
) => {
  let text = template;
  Object.entries(vars).forEach(([name, value]) => {
    const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`\\{\\s*${safeName}\\s*\\}`, "g"), String(value));
  });
  return text;
};

export const resolveExportBaseName = (rawName?: string) => {
  const trimmed = (rawName || "").trim();
  const lower = trimmed.toLowerCase();
  const replacedSpaces = lower.replace(/\s+/g, "-");
  const safe = replacedSpaces.replace(/[^a-z0-9\-_.]+/g, "");
  return safe || "card";
};

export const resolveExportFileName = (rawName: string, usedNames: Map<string, number>) => {
  const baseName = resolveExportBaseName(rawName);
  const withExtension = baseName.endsWith(".png") ? baseName : `${baseName}.png`;
  const currentCount = usedNames.get(withExtension) ?? 0;
  usedNames.set(withExtension, currentCount + 1);
  if (currentCount === 0) {
    return withExtension;
  }
  const dotIndex = withExtension.lastIndexOf(".");
  const stem = dotIndex >= 0 ? withExtension.slice(0, dotIndex) : withExtension;
  const ext = dotIndex >= 0 ? withExtension.slice(dotIndex) : "";
  return `${stem}-${currentCount + 1}${ext}`;
};

export const waitForFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

export const waitForAssetElements = async (
  getSvgElement: () => SVGSVGElement | null | undefined,
  assetIds: string[],
  timeoutMs = 4000,
) => {
  if (!assetIds.length) return;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const svg = getSvgElement();
    if (svg) {
      const hasAllAssets = assetIds.every((id) =>
        svg.querySelector(`image[data-user-asset-id="${id}"]`),
      );
      if (hasAllAssets) {
        return;
      }
    }
    await waitForFrame();
  }
};

export const resolveZipFileName = (
  getCollectionName: () => string | null | undefined,
) => {
  const now = new Date();
  const pad = (value: number) => (value < 10 ? `0${value}` : `${value}`);
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join("") +
    "-" +
    [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join("");
  const collectionName = getCollectionName();
  const base = collectionName ? resolveExportBaseName(collectionName) : "heroquest-cards";
  return `${base}-${timestamp}.zip`;
};
