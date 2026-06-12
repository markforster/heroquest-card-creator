export const HQCC_ITCH_DOWNLOAD_URL =
  "https://mark-forster.itch.io/heroquest-card-creator?source=in-app-download";

type ItchWindow = Window &
  typeof globalThis & {
    Itch?: {
      attachBuyButton?: (
        el: HTMLElement,
        opts: { user: string; game: string; width?: number; height?: number },
      ) => void;
    };
  };

export function attachItchBuyButton(link: HTMLElement | null): void {
  if (!link || typeof window === "undefined") return;
  const itch = (window as ItchWindow).Itch;
  if (!itch?.attachBuyButton) return;
  itch.attachBuyButton(link, {
    user: "mark-forster",
    game: "heroquest-card-creator",
    width: 650,
    height: 400,
  });
}
