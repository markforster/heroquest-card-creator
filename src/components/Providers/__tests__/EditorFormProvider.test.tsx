import { act, renderHook } from "@testing-library/react";

import { EditorFormProvider, useEditorForm } from "@/components/Providers/EditorFormContext";
import { createDefaultCardData } from "@/types/card-data";

import type { ReactNode } from "react";

describe("EditorFormProvider", () => {
  it("publishes form methods and replaces the saved values on reset", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <EditorFormProvider>{children}</EditorFormProvider>
    );
    const { result } = renderHook(() => useEditorForm(), { wrapper });
    const replacement = { ...createDefaultCardData("hero"), name: "Replacement" };

    act(() => result.current.resetWithSaved(replacement));

    expect(result.current.savedValues).toEqual(replacement);
    expect(result.current.methods.getValues("name")).toBe("Replacement");
  });
});
