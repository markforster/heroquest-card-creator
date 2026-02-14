import { waitForFrame } from "@/components/Stockpile/stockpile-utils";

describe("waitForFrame", () => {
  it("resolves on the next animation frame", async () => {
    const original = global.requestAnimationFrame;
    const raf = jest.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    global.requestAnimationFrame = raf;

    await expect(waitForFrame()).resolves.toBeUndefined();
    expect(raf).toHaveBeenCalledTimes(1);

    global.requestAnimationFrame = original;
  });
});
