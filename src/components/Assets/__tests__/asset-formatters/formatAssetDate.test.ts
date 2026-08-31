import { formatAssetDate } from "@/components/Assets/asset-formatters";

describe("formatAssetDate", () => {
  it("formats the timestamp using the browser locale", () => {
    const toLocaleString = jest
      .spyOn(Date.prototype, "toLocaleString")
      .mockReturnValue("formatted");

    expect(formatAssetDate(1234)).toBe("formatted");
    expect(toLocaleString).toHaveBeenCalledTimes(1);
  });
});
