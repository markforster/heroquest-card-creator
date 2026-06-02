import { render, screen } from "@testing-library/react";

import RibbonTitle from "@/components/Cards/CardParts/RibbonTitle";

jest.mock("@/lib/text-fitting/fitText", () => ({
  __esModule: true,
  default: () => ({
    lines: ["Quest 123"],
    fontSize: 42,
  }),
}));

jest.mock("@/components/Providers/TextFittingPreferencesContext", () => ({
  useTextFittingPreferences: () => ({
    preferences: {
      title: {},
    },
  }),
}));

jest.mock("@/components/Providers/DebugVisualsContext", () => ({
  useDebugVisuals: () => ({
    showTextBounds: false,
  }),
}));

describe("RibbonTitle numeric features", () => {
  it("renders title text with the numeric-feature-enabled title path", () => {
    render(
      <svg>
        <RibbonTitle title="Quest 123" showRibbon={false} />
      </svg>,
    );

    expect(screen.getByText("Quest 123")).toBeInTheDocument();
  });
});
