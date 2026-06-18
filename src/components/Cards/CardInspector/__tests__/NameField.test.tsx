import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

import NameField from "@/components/Cards/CardInspector/NameField";

function NameValueProbe() {
  const name = useWatch({ name: "name" }) as string | undefined;
  return <div data-testid="name-value">{name ?? ""}</div>;
}

function TestHarness() {
  const methods = useForm({
    defaultValues: {
      name: "Treasure Deck",
    },
  });

  return (
    <FormProvider {...methods}>
      <NameField label="form.name" />
      <NameValueProbe />
    </FormProvider>
  );
}

describe("NameField", () => {
  it("renders the stored name and updates only the name form value", () => {
    render(<TestHarness />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("Treasure Deck");

    fireEvent.change(input, { target: { value: "Relics Deck" } });

    expect(input).toHaveValue("Relics Deck");
    expect(screen.getByTestId("name-value")).toHaveTextContent("Relics Deck");
  });
});
