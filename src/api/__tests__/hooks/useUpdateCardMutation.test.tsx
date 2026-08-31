const useMutation = jest.fn();
const updateCard = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useMutation: (...args: unknown[]) => useMutation(...args),
}));

jest.mock("@zodios/react", () => ({
  ZodiosHooks: jest.fn(
    () =>
      new Proxy(
        {},
        {
          get: () => jest.fn(),
        },
      ),
  ),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    updateCard: (...args: unknown[]) => updateCard(...args),
  },
}));

import { renderHook } from "@testing-library/react";

import { useUpdateCardMutation } from "@/api/hooks";

describe("useUpdateCardMutation", () => {
  let mutationFn: (args: { id: string; body: { name: string } }) => Promise<unknown>;

  beforeEach(() => {
    useMutation.mockReset().mockImplementation((options) => {
      mutationFn = options.mutationFn;
      return {};
    });
    updateCard.mockReset().mockResolvedValue({ id: "card-1" });
  });

  it("updates a card through the API client", async () => {
    renderHook(() => useUpdateCardMutation());
    const body = { name: "Updated" };

    await expect(mutationFn({ id: "card-1", body })).resolves.toEqual({
      id: "card-1",
    });
    expect(updateCard).toHaveBeenCalledWith(body, { params: { id: "card-1" } });
  });
});
