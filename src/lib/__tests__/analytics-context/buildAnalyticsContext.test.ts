import { buildAnalyticsContext } from "@/lib/analytics-context";

const VERSION = "0.5.5";

describe("buildAnalyticsContext", () => {
  it("marks file protocol as local and omits app_url", () => {
    const context = buildAnalyticsContext(
      {
        protocol: "file:",
        hostname: "",
        origin: "null",
        pathname: "/Users/mark/Desktop/index.html",
        href: "file:///Users/mark/Desktop/index.html",
      },
      VERSION,
    );

    expect(context).toEqual({
      app_distribution: "local",
      app_version: VERSION,
      app_host: "local",
      app_url: undefined,
    });
  });

  it("detects itch.io distribution", () => {
    const context = buildAnalyticsContext(
      {
        protocol: "https:",
        hostname: "mark-forster.itch.io",
        origin: "https://mark-forster.itch.io",
        pathname: "/heroquest-card-creator",
        href: "https://mark-forster.itch.io/heroquest-card-creator?utm=1",
      },
      VERSION,
    );

    expect(context.app_distribution).toBe("itch");
    expect(context.app_host).toBe("mark-forster.itch.io");
    expect(context.app_url).toBe("https://mark-forster.itch.io/heroquest-card-creator");
  });

  it("detects self-hosted distribution", () => {
    const context = buildAnalyticsContext(
      {
        protocol: "https:",
        hostname: "example.com",
        origin: "https://example.com",
        pathname: "/tools/card-maker",
        href: "https://example.com/tools/card-maker#section",
      },
      VERSION,
    );

    expect(context.app_distribution).toBe("self_hosted");
    expect(context.app_host).toBe("example.com");
    expect(context.app_url).toBe("https://example.com/tools/card-maker");
  });

  it("uses build-time override for distribution when provided", () => {
    const original = process.env.NEXT_PUBLIC_APP_DISTRIBUTION;
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "npm";

    const context = buildAnalyticsContext(
      {
        protocol: "https:",
        hostname: "example.com",
        origin: "https://example.com",
        pathname: "/tools/card-maker",
        href: "https://example.com/tools/card-maker",
      },
      VERSION,
    );

    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = original;

    expect(context.app_distribution).toBe("npm");
  });

  it("falls back to unknown distribution when hostname missing", () => {
    const context = buildAnalyticsContext(
      {
        protocol: "https:",
        hostname: "",
        origin: "",
        pathname: "",
        href: "",
      },
      VERSION,
    );

    expect(context.app_distribution).toBe("unknown");
    expect(context.app_host).toBe("unknown");
    expect(context.app_url).toBeUndefined();
  });
});
