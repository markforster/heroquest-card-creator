jest.mock("@/api/client", () => ({
  apiClient: {
    listHeroBackLogos: jest.fn(),
    getHeroBackLogoObjectUrl: jest.fn(),
    getHeroBackLogoUsage: jest.fn(),
    addHeroBackLogo: jest.fn(),
    deleteHeroBackLogo: jest.fn(),
  },
}));

import { apiClient } from "@/api/client";
import {
  addHeroBackLogo,
  deleteHeroBackLogo,
  getHeroBackLogoObjectUrl,
  getHeroBackLogoUsage,
  listHeroBackLogos,
} from "@/api/heroBackLogos/client";

describe("hero back logo client", () => {
  const mocks = jest.mocked(apiClient);

  beforeEach(() => {
    mocks.listHeroBackLogos.mockReset();
    mocks.getHeroBackLogoObjectUrl.mockReset();
    mocks.getHeroBackLogoUsage.mockReset();
    mocks.addHeroBackLogo.mockReset();
    mocks.deleteHeroBackLogo.mockReset();
  });

  it("delegates every operation to the API client with the expected request shape", async () => {
    const blob = new Blob(["logo"]);
    mocks.listHeroBackLogos.mockResolvedValue([]);
    mocks.getHeroBackLogoObjectUrl.mockResolvedValue("blob:logo");
    mocks.getHeroBackLogoUsage.mockResolvedValue([]);
    mocks.addHeroBackLogo.mockResolvedValue({ id: "logo-1" } as never);
    mocks.deleteHeroBackLogo.mockResolvedValue(undefined as never);

    await expect(listHeroBackLogos()).resolves.toEqual([]);
    await expect(getHeroBackLogoObjectUrl("logo-1")).resolves.toBe("blob:logo");
    await expect(getHeroBackLogoUsage("logo-1")).resolves.toEqual([]);
    await addHeroBackLogo("logo-1", blob, {
      name: "Logo",
      mimeType: "image/png",
      width: 100,
      height: 100,
    });
    await deleteHeroBackLogo("logo-1", { mode: "custom", logoId: "logo-2" });

    expect(mocks.getHeroBackLogoObjectUrl).toHaveBeenCalledWith({ params: { id: "logo-1" } });
    expect(mocks.getHeroBackLogoUsage).toHaveBeenCalledWith({ params: { id: "logo-1" } });
    expect(mocks.addHeroBackLogo).toHaveBeenCalledWith(
      expect.objectContaining({ id: "logo-1", blob, name: "Logo" }),
    );
    expect(mocks.deleteHeroBackLogo).toHaveBeenCalledWith(
      { mode: "custom", logoId: "logo-2" },
      { params: { id: "logo-1" } },
    );
  });
});
