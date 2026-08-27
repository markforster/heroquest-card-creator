import { render, waitFor } from "@testing-library/react";

import { StoragePersistenceProvider } from "@/components/Providers/StoragePersistenceProvider";
import { requestStoragePersistence } from "@/lib/storage-persistence";

jest.mock("@/lib/storage-persistence", () => ({
  requestStoragePersistence: jest.fn(),
}));

const requestStoragePersistenceMock = jest.mocked(requestStoragePersistence);

describe("StoragePersistenceProvider", () => {
  beforeEach(() => {
    requestStoragePersistenceMock.mockReset().mockResolvedValue("not-protected");
  });

  it("requests browser storage persistence on mount", async () => {
    render(
      <StoragePersistenceProvider>
        <div>App</div>
      </StoragePersistenceProvider>,
    );

    await waitFor(() => expect(requestStoragePersistenceMock).toHaveBeenCalledTimes(1));
  });
});
