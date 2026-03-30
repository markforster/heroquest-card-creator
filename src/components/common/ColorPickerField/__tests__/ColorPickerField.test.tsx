import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import ColorPickerField from "@/components/common/ColorPickerField";
import { I18nProvider } from "@/i18n/I18nProvider";

jest.mock("react-colorful", () => ({
  RgbaColorPicker: ({
    onChange,
    className,
  }: {
    onChange: (value: { r: number; g: number; b: number; a: number }) => void;
    className?: string;
  }) => (
    <button
      type="button"
      className={className}
      onClick={() => onChange({ r: 16, g: 32, b: 48, a: 0.5 })}
    >
      picker-change
    </button>
  ),
}));

jest.mock("@/hooks/useSharedColorSwatches", () => ({
  useSharedColorSwatches: () => ({
    swatches: [],
    saveSwatch: jest.fn(async () => {}),
    removeSwatch: jest.fn(async () => {}),
    maxSwatches: 10,
  }),
}));

type Props = React.ComponentProps<typeof ColorPickerField>;

function renderField(override: Partial<Props> = {}) {
  const onChange = override.onChange ?? jest.fn();
  const props: Props = {
    label: "Color",
    inputValue: "#ABCDEF12",
    selectedValue: "#ABCDEF12",
    defaultColor: "#310101",
    smartGroups: [],
    isSmartBusy: false,
    onRequestSmart: jest.fn(),
    onChange,
    onSelectDefault: jest.fn(),
    onSelectTransparent: jest.fn(),
    canRevert: false,
    onRevert: jest.fn(),
    isOpen: true,
    onToggleOpen: jest.fn(),
    onClose: jest.fn(),
    ...override,
  };

  render(
    <I18nProvider>
      <ColorPickerField {...props} />
    </I18nProvider>,
  );

  return { onChange, props };
}

function renderControlledField(override: Partial<Props> = {}) {
  const {
    inputValue: _ignoredInputValue,
    selectedValue: _ignoredSelectedValue,
    onChange: _ignoredOnChange,
    ...restOverride
  } = override;
  const onChangeSpy = jest.fn();
  const initialValue =
    override.selectedValue ??
    override.inputValue ??
    "#ABCDEF12";

  function ControlledField() {
    const [value, setValue] = useState(initialValue);
    return (
      <ColorPickerField
        label="Color"
        inputValue={value}
        selectedValue={value}
        defaultColor="#310101"
        smartGroups={[]}
        isSmartBusy={false}
        onRequestSmart={jest.fn()}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
        onSelectDefault={jest.fn()}
        onSelectTransparent={jest.fn()}
        canRevert={false}
        onRevert={jest.fn()}
        isOpen
        onToggleOpen={jest.fn()}
        onClose={jest.fn()}
        {...restOverride}
      />
    );
  }

  render(
    <I18nProvider>
      <ControlledField />
    </I18nProvider>,
  );

  return { onChangeSpy };
}

describe("ColorPickerField", () => {
  it("sanitizes invalid characters while typing in the popover input", () => {
    renderField({ showInput: false });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "#12zz!!34" } });

    expect(input).toHaveValue("#1234");
  });

  it("commits valid hex on Enter and normalizes to uppercase hex with alpha", () => {
    const { onChangeSpy } = renderControlledField({ showInput: false });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "#1234" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChangeSpy).toHaveBeenLastCalledWith("#11223344");
    expect(input).toHaveValue("#11223344");
  });

  it("reverts invalid draft to current normalized selected value on blur", () => {
    const onChange = jest.fn();
    renderField({ showInput: false, onChange, inputValue: "#ABCDEF12", selectedValue: "#ABCDEF12" });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "#12" } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("#ABCDEF12");
  });

  it("updates popover input when picker changes color", () => {
    const onChange = jest.fn();
    renderField({ showInput: false, onChange });

    fireEvent.click(screen.getByRole("button", { name: "picker-change" }));

    expect(onChange).toHaveBeenLastCalledWith("#10203080");
    expect(screen.getByRole("textbox")).toHaveValue("#10203080");
  });

  it("updates popover input when a swatch is selected", () => {
    const onChange = jest.fn();
    renderField({
      showInput: false,
      onChange,
      presetSwatches: ["#445566"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Select #445566" }));

    expect(onChange).toHaveBeenLastCalledWith("#445566FF");
    expect(screen.getByRole("textbox")).toHaveValue("#445566FF");
  });

  it("strips alpha when allowAlpha is false", () => {
    const { onChangeSpy } = renderControlledField({
      showInput: false,
      allowAlpha: false,
      inputValue: "#ABCDEF",
      selectedValue: "#ABCDEF",
    });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "#11223344" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChangeSpy).toHaveBeenLastCalledWith("#112233");
    expect(input).toHaveValue("#112233");
  });

  it("keeps inline input when showInput is true and popover is closed", () => {
    renderField({ isOpen: false, showInput: true });

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders popover manual input when showInput is false", () => {
    renderField({ showInput: false, isOpen: true });

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
