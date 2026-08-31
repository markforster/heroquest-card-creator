import { titleAlgorithm } from "@/lib/text-fitting/algorithms";
import fitText from "@/lib/text-fitting/fitText";
import {
  ellipsisStrategy,
  ellipsisStrategyNoop,
  overflowStrategy,
  type StrategyContext,
} from "@/lib/text-fitting/strategies";

const context: StrategyContext = {
  role: "title",
  text: "",
  bounds: { width: 100, height: 40 },
  fontSize: 20,
  lineHeight: 22,
  lines: ["Existing"],
  fontFamily: "sans-serif",
};

describe("exported text-fitting algorithms and strategies", () => {
  beforeEach(() => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("produces the legacy title layout", () => {
    expect(titleAlgorithm("Title")).toEqual(
      expect.objectContaining({ role: "title", lines: ["Title"], strategyUsed: "legacy-title" }),
    );
  });

  it("delegates the public fitText API to the fitting engine", () => {
    expect(fitText("title", "Title", { width: 300, height: 80 })).toEqual(
      expect.objectContaining({ role: "title" }),
    );
  });

  it("covers empty ellipsis, no-op ellipsis, and overflow outcomes", () => {
    expect(ellipsisStrategy(context)).toEqual(
      expect.objectContaining({
        success: false,
        layout: expect.objectContaining({ ellipsis: false }),
      }),
    );
    expect(ellipsisStrategyNoop(context)).toEqual(
      expect.objectContaining({
        success: true,
        layout: expect.objectContaining({ overflow: false }),
      }),
    );
    expect(overflowStrategy(context)).toEqual(
      expect.objectContaining({
        success: true,
        layout: expect.objectContaining({ overflow: true }),
      }),
    );
  });
});
