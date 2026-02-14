import { waitForAssetElements } from "@/components/Stockpile/stockpile-utils";

describe("waitForAssetElements", () => {
  const originalNow = Date.now;
  const originalRaf = global.requestAnimationFrame;

  afterEach(() => {
    Date.now = originalNow;
    global.requestAnimationFrame = originalRaf;
  });

  it("resolves immediately when assets are present", async () => {
    global.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    };
    Date.now = () => 0;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttribute("data-user-asset-id", "asset-1");
    svg.appendChild(img);

    await expect(
      waitForAssetElements(() => svg, ["asset-1"]),
    ).resolves.toBeUndefined();
  });

  it("waits until assets appear", async () => {
    let rafCalls = 0;
    global.requestAnimationFrame = (callback: FrameRequestCallback) => {
      rafCalls += 1;
      callback(0);
      return rafCalls;
    };

    let now = 0;
    Date.now = () => now;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttribute("data-user-asset-id", "asset-1");

    let calls = 0;
    const getSvgElement = () => {
      calls += 1;
      if (calls > 1) {
        if (!svg.contains(img)) {
          svg.appendChild(img);
        }
        return svg;
      }
      return null;
    };

    const promise = waitForAssetElements(getSvgElement, ["asset-1"], 50);
    now = 10;
    await expect(promise).resolves.toBeUndefined();
    expect(rafCalls).toBeGreaterThan(0);
  });

  it("stops waiting after the timeout", async () => {
    global.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    };

    const times = [0, 10, 1000];
    let idx = 0;
    Date.now = () => {
      const value = times[Math.min(idx, times.length - 1)];
      idx += 1;
      return value;
    };

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    await expect(
      waitForAssetElements(() => svg, ["missing"], 5),
    ).resolves.toBeUndefined();
  });
});
