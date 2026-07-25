import { act, render } from "@testing-library/react";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";

import HiddenCardThumbnailRefreshHost from "@/components/App/pages/cards/HiddenCardThumbnailRefreshHost";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview";
import type { CardRecord } from "@/types/cards-db";
import type { TemplateId } from "@/types/templates";

const renderToJpegBlobMock = jest.fn();
const waitForBackgroundLoadedMock = jest.fn();
const syncCopyrightContrastMock = jest.fn();
const getSvgElementMock = jest.fn();
const mountedInstanceIds: number[] = [];

jest.mock("@/app/page.module.css", () => ({
  bulkExportPreview: "bulkExportPreview",
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({ language: "en" }),
}));

jest.mock("@/i18n/getTemplateNameLabel", () => ({
  __esModule: true,
  getTemplateNameLabel: () => "Hero Back",
}));

jest.mock("@/data/card-templates", () => ({
  __esModule: true,
  cardTemplatesById: {
    "hero-back": {
      id: "hero-back",
      background: "/hero-back.png",
    },
  },
}));

jest.mock("@/lib/card-record-mapper", () => ({
  __esModule: true,
  cardRecordToCardData: (record: CardRecord) => ({
    name: record.name,
    heroBackLogoMode: record.heroBackLogoMode,
    heroBackLogoId: record.heroBackLogoId,
  }),
}));

jest.mock("@/lib/card-assets", () => ({
  __esModule: true,
  collectCardAssetIds: () => [],
  collectCardHeroBackLogoIds: () => [],
}));

jest.mock("@/lib/export-assets-cache", () => ({
  __esModule: true,
  buildAssetCache: async () => ({ cache: new Map(), missing: new Set() }),
  buildHeroBackLogoCache: async () => ({ cache: new Map(), missing: new Set() }),
}));

jest.mock("@/components/Stockpile/stockpile-utils", () => ({
  __esModule: true,
  waitForFrame: async () => {},
  waitForAssetElements: async () => {},
}));

jest.mock("@/components/Cards/CardPreview", () => {
  let instanceId = 0;

  return {
    __esModule: true,
    default: forwardRef<CardPreviewHandle, { cardData?: { name?: string } }>(function MockCardPreview(
      props,
      ref,
    ) {
      const localId = useMemo(() => {
        instanceId += 1;
        mountedInstanceIds.push(instanceId);
        return instanceId;
      }, []);
      const svgRef = useRef<SVGSVGElement | null>(null);

      useImperativeHandle(ref, () => ({
        renderToJpegBlob: (...args: Parameters<NonNullable<CardPreviewHandle["renderToJpegBlob"]>>) =>
          renderToJpegBlobMock(localId, props.cardData?.name, ...args),
        waitForBackgroundLoaded: (...args: Parameters<NonNullable<CardPreviewHandle["waitForBackgroundLoaded"]>>) =>
          waitForBackgroundLoadedMock(localId, ...args),
        syncCopyrightContrast: (...args: Parameters<NonNullable<CardPreviewHandle["syncCopyrightContrast"]>>) =>
          syncCopyrightContrastMock(localId, ...args),
        getSvgElement: (...args: Parameters<NonNullable<CardPreviewHandle["getSvgElement"]>>) =>
          getSvgElementMock(localId, ...args) ?? svgRef.current,
      }));

      return <svg ref={svgRef} data-testid={`mock-preview-${localId}`} />;
    }),
  };
});

function buildCard(id: string, name: string): CardRecord & { templateId: TemplateId } {
  return {
    id,
    templateId: "hero-back",
    status: "saved",
    name,
    nameLower: name.toLowerCase(),
    createdAt: 1,
    updatedAt: 2,
    schemaVersion: 2,
    thumbnailBlob: null,
    heroBackLogoMode: "default",
  };
}

describe("HiddenCardThumbnailRefreshHost", () => {
  beforeEach(() => {
    mountedInstanceIds.length = 0;
    renderToJpegBlobMock.mockReset();
    waitForBackgroundLoadedMock.mockReset();
    syncCopyrightContrastMock.mockReset();
    getSvgElementMock.mockReset();
    renderToJpegBlobMock.mockImplementation(async (instanceId: number, name?: string) => {
      return new Blob([`${instanceId}:${name ?? "unknown"}`], { type: "image/jpeg" });
    });
    waitForBackgroundLoadedMock.mockResolvedValue(undefined);
    syncCopyrightContrastMock.mockResolvedValue(undefined);
    getSvgElementMock.mockImplementation(() => null);
  });

  it("uses an isolated preview instance for each sequential thumbnail render", async () => {
    const hostRef: { current: { renderThumbnail: (card: CardRecord) => Promise<Blob | null> } | null } = {
      current: null,
    };

    render(<HiddenCardThumbnailRefreshHost ref={hostRef} />);

    let firstBlob: Blob | null = null;
    let secondBlob: Blob | null = null;
    let firstPromise: Promise<Blob | null> | null = null;
    let secondPromise: Promise<Blob | null> | null = null;

    act(() => {
      firstPromise = hostRef.current?.renderThumbnail(buildCard("card-1", "First")) ?? null;
    });
    await act(async () => {
      firstBlob = await firstPromise;
    });

    act(() => {
      secondPromise = hostRef.current?.renderThumbnail(buildCard("card-2", "Second")) ?? null;
    });
    await act(async () => {
      secondBlob = await secondPromise;
    });

    expect(firstBlob).toBeInstanceOf(Blob);
    expect(secondBlob).toBeInstanceOf(Blob);
    expect(mountedInstanceIds).toEqual([1, 2]);
    expect(renderToJpegBlobMock).toHaveBeenCalledTimes(2);
    expect(renderToJpegBlobMock).toHaveBeenNthCalledWith(
      1,
      1,
      "First",
      expect.objectContaining({ width: 225, height: 315 }),
    );
    expect(renderToJpegBlobMock).toHaveBeenNthCalledWith(
      2,
      2,
      "Second",
      expect.objectContaining({ width: 225, height: 315 }),
    );
  });
});
