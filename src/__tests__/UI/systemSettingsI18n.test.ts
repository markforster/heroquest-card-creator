import {
  formatSystemSettingsTimestamp,
  getSystemSettingsStoreLabel,
} from "@/components/Modals/SettingsModal/systemSettingsI18n";
import { messages } from "@/i18n/messages";

describe("systemSettingsI18n", () => {
  it("maps known store ids to translated labels", () => {
    const t = (key: string) =>
      ({
        "label.storePairs": "Emparejamientos",
      })[key] ?? key;

    expect(getSystemSettingsStoreLabel("pairs", t)).toBe("Emparejamientos");
  });

  it("falls back to a humanized label for unknown store ids", () => {
    const t = (key: string) => key;

    expect(getSystemSettingsStoreLabel("foo-bar", t)).toBe("Foo bar");
  });

  it("formats timestamps using the selected app language locale", () => {
    expect(formatSystemSettingsTimestamp(new Date("2026-03-14T00:37:08Z"), "en")).toMatch(
      /\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}/,
    );
  });

  it("provides translated copy for the system settings nav item", () => {
    expect(messages.en["heading.systemSettings"]).toBe("System");
    expect(messages.fr["heading.systemSettings"]).toBe("Système");
    expect(messages.fi["heading.systemSettings"]).toBe("Järjestelmä");
  });
});
