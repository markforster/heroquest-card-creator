/**
 * @jest-environment node
 */

import { openHqccDb } from "@/lib/hqcc-db";

describe("openHqccDb (node)", () => {
  it("rejects when window is undefined", async () => {
    await expect(openHqccDb()).rejects.toThrow("IndexedDB not available");
  });
});

