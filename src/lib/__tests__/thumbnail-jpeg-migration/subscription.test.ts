import {
  getThumbnailJpegMigrationStatus,
  subscribeThumbnailJpegMigration,
} from "@/lib/db/migrations/thumbnail-jpeg-migration";

describe("thumbnail JPEG migration subscription", () => {
  it("immediately publishes current status and supports unsubscribe", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeThumbnailJpegMigration(listener);

    expect(listener).toHaveBeenCalledWith(getThumbnailJpegMigrationStatus());
    expect(unsubscribe()).toBe(true);
  });
});
