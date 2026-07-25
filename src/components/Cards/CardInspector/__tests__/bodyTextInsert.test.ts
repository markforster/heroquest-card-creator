import { insertTextAtSelection } from "@/components/Cards/CardInspector/body-text-insert";

describe("insertTextAtSelection", () => {
  it("inserts text through the textarea edit path when available", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "Hello world";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.setSelectionRange(6, 11);

    const handleInput = jest.fn();
    textarea.addEventListener("input", handleInput);

    insertTextAtSelection({
      textarea,
      currentValue: textarea.value,
      insertedText: "\u{1F600}",
      selectionStart: 6,
      selectionEnd: 11,
      onChange: jest.fn(),
    });

    expect(textarea.value).toBe("Hello \u{1F600}");
    expect(textarea.selectionStart).toBe(8);
    expect(textarea.selectionEnd).toBe(8);
    expect(handleInput).toHaveBeenCalledTimes(1);
  });

  it("falls back to controlled state updates when no textarea is available", () => {
    const onChange = jest.fn();

    insertTextAtSelection({
      textarea: null,
      currentValue: "Hello world",
      insertedText: "\u{1F600}",
      selectionStart: 6,
      selectionEnd: 11,
      onChange,
    });

    expect(onChange).toHaveBeenCalledWith("Hello \u{1F600}");
  });
});
