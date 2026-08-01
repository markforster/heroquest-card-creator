import { now } from "@/lib/time";

describe("now", () => {
  it("uses the high-resolution performance clock when available", () => {
    jest.spyOn(performance, "now").mockReturnValue(123.5);
    expect(now()).toBe(123.5);
  });
});
