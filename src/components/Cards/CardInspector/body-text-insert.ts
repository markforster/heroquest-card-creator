export type InsertTextAtSelectionOptions = {
  textarea: HTMLTextAreaElement | null;
  currentValue: string;
  insertedText: string;
  selectionStart?: number;
  selectionEnd?: number;
  onChange: (nextValue: string) => void;
};

export function insertTextAtSelection({
  textarea,
  currentValue,
  insertedText,
  selectionStart,
  selectionEnd,
  onChange,
}: InsertTextAtSelectionOptions) {
  const resolvedSelectionStart = selectionStart ?? textarea?.selectionStart ?? currentValue.length;
  const resolvedSelectionEnd = selectionEnd ?? textarea?.selectionEnd ?? currentValue.length;
  if (textarea) {
    textarea.focus();
    textarea.setSelectionRange(resolvedSelectionStart, resolvedSelectionEnd);
    if (
      typeof document.execCommand === "function" &&
      document.execCommand("insertText", false, insertedText)
    ) {
      return;
    }
    textarea.setRangeText(insertedText, resolvedSelectionStart, resolvedSelectionEnd, "end");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    window.requestAnimationFrame(() => {
      textarea.focus();
    });
    return;
  }

  const nextValue = `${currentValue.slice(0, resolvedSelectionStart)}${insertedText}${currentValue.slice(resolvedSelectionEnd)}`;

  onChange(nextValue);
}
