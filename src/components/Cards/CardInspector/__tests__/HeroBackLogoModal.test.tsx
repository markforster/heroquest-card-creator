import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import HeroBackLogoModal from "@/components/Cards/CardInspector/HeroBackLogoModal";

const deleteHeroBackLogo = jest.fn();
const getHeroBackLogoUsage = jest.fn();
const listHeroBackLogos = jest.fn();

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "heading.heroBackLogos": "Hero Back logos",
          "helper.heroBackLogoManage":
            "Delete saved custom logos. The baked default logo is managed separately and is always available.",
          "confirm.deleteHeroBackLogoTitle": "Delete logo?",
          "confirm.deleteHeroBackLogoInUse": "{count} cards are using this logo.",
          "label.useDefaultLogo": "Switch affected cards to the baked default logo",
          "label.replaceWithAnotherLogo": "Switch affected cards to another saved logo",
          "actions.cancel": "Cancel",
          "actions.delete": "Delete",
          "actions.close": "Close",
          "status.noSavedLogos": "No saved custom logos yet.",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

jest.mock("@/hooks/useHeroBackLogoImageUrl", () => ({
  useHeroBackLogoImageUrl: () => ({ url: "blob:logo" }),
}));

jest.mock("@/lib/hero-back-logos-db", () => ({
  deleteHeroBackLogo: (...args: unknown[]) => deleteHeroBackLogo(...args),
  getHeroBackLogoUsage: (...args: unknown[]) => getHeroBackLogoUsage(...args),
  listHeroBackLogos: (...args: unknown[]) => listHeroBackLogos(...args),
}));

describe("HeroBackLogoModal", () => {
  beforeEach(() => {
    deleteHeroBackLogo.mockReset();
    getHeroBackLogoUsage.mockReset();
    listHeroBackLogos.mockReset();
  });

  it("shows only management UI for saved custom logos", async () => {
    listHeroBackLogos.mockResolvedValue([
      { id: "logo-1", name: "Clan Raven", width: 320, height: 90 },
    ]);

    render(
      <HeroBackLogoModal
        isOpen
        currentLogoId="logo-1"
        onClose={jest.fn()}
        onDeleted={jest.fn()}
      />,
    );

    expect(await screen.findByText("Hero Back logos")).toBeInTheDocument();
    expect(screen.getByText("Clan Raven")).toBeInTheDocument();
    expect(screen.queryByText("Upload")).not.toBeInTheDocument();
    expect(screen.queryByText("Select")).not.toBeInTheDocument();
  });

  it("prompts remediation without a no-logo option when deleting an in-use logo", async () => {
    listHeroBackLogos.mockResolvedValue([
      { id: "logo-1", name: "Clan Raven", width: 320, height: 90 },
      { id: "logo-2", name: "Moon Wolf", width: 300, height: 100 },
    ]);
    getHeroBackLogoUsage.mockResolvedValue([{ cardId: "card-1", name: "Card 1", logoMode: "custom" }]);

    render(
      <HeroBackLogoModal
        isOpen
        currentLogoId="logo-1"
        onClose={jest.fn()}
        onDeleted={jest.fn()}
      />,
    );

    const deleteButtons = await screen.findAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons[0]);

    expect(await screen.findByText("Delete logo?")).toBeInTheDocument();
    expect(screen.getByText("Switch affected cards to the baked default logo")).toBeInTheDocument();
    expect(screen.getByText("Switch affected cards to another saved logo")).toBeInTheDocument();
    expect(screen.queryByText(/no logo/i)).not.toBeInTheDocument();
  });

  it("deletes an unused logo immediately with default remediation", async () => {
    const onDeleted = jest.fn();
    listHeroBackLogos.mockResolvedValue([{ id: "logo-1", name: "Clan Raven", width: 320, height: 90 }]);
    getHeroBackLogoUsage.mockResolvedValue([]);
    deleteHeroBackLogo.mockResolvedValue([]);

    render(
      <HeroBackLogoModal
        isOpen
        currentLogoId="logo-1"
        onClose={jest.fn()}
        onDeleted={onDeleted}
      />,
    );

    fireEvent.click((await screen.findAllByRole("button", { name: "Delete" }))[0]);

    await waitFor(() => {
      expect(deleteHeroBackLogo).toHaveBeenCalledWith("logo-1", { mode: "default" });
    });
    expect(onDeleted).toHaveBeenCalledWith("logo-1", { mode: "default" }, null, []);
  });
});
