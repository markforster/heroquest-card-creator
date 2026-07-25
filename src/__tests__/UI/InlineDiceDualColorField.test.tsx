import { fireEvent, render, screen } from "@testing-library/react";

import InlineDiceDualColorField from "@/components/Cards/CardInspector/InlineDiceDualColorField";

jest.mock("@/components/common/ColorPickerField", () => ({
  __esModule: true,
  default: function MockColorPickerField({
    label,
    onChange,
  }: {
    label: string;
    onChange: (value: string) => void;
  }) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => onChange(label === "Symbol / pips color" ? "#D6A600" : "#B21D1D")}
      >
        {label}
      </button>
    );
  },
}));

describe("InlineDiceDualColorField", () => {
  it("routes front and back swatch interactions to separate callbacks", () => {
    const onFrontColorChange = jest.fn();
    const onBackColorChange = jest.fn();

    render(
      <InlineDiceDualColorField
        frontLabel="Symbol / pips color"
        backLabel="Background color"
        frontColor="#111111"
        backColor="#FFFFFF"
        frontDefaultColor="#111111"
        backDefaultColor="#FFFFFF"
        presetSwatches={["#FFFFFF", "#111111"]}
        onFrontColorChange={onFrontColorChange}
        onBackColorChange={onBackColorChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Symbol / pips color" }));
    fireEvent.click(screen.getByRole("button", { name: "Background color" }));

    expect(onFrontColorChange).toHaveBeenCalledWith("#D6A600");
    expect(onBackColorChange).toHaveBeenCalledWith("#B21D1D");
  });
});
