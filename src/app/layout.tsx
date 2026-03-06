import { GoogleAnalytics } from "@next/third-parties/google";

import { AnalyticsProvider } from "@/components/Providers/AnalyticsProvider";
import I18nProviderClient from "@/components/Providers/I18nProviderClient";

import type { Metadata, Viewport } from "next";
import type { PropsWithChildren } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const gaId = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "HeroQuest Card Creator",
  description: "A browser-based tool for creating custom HeroQuest-style cards.",
  keywords: ["HeroQuest", "card creator", "card maker", "tabletop", "board game", "print and play"],
  authors: [{ name: "HeroQuest Card Creator" }],
  alternates: { canonical: "/" },
  icons: {
    icon: "./favicon.ico",
    shortcut: "./favicon.ico",
    apple: "./favicon.ico",
  },
  openGraph: {
    title: "HeroQuest Card Creator",
    description: "Create and export custom HeroQuest-style cards directly in your browser.",
    url: "/",
    siteName: "HeroQuest Card Creator",
    images: [
      {
        url: "/images/IMG_2912.jpg",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HeroQuest Card Creator",
    description: "Create and export custom HeroQuest-style cards directly in your browser.",
    images: [
      {
        url: "/images/IMG_2912.jpg",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#375f8a",
  colorScheme: "light dark",
};

type RootLayoutProps = Readonly<PropsWithChildren<unknown>>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      {/* {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null} */}
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var stored = null;
    try {
      stored = window.localStorage.getItem("hqcc.theme");
    } catch (_err) {
      stored = null;
    }
    var systemDark = false;
    if (window.matchMedia) {
      systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    var resolved = "dark";
    if (stored === "light" || stored === "dark") {
      resolved = stored;
    } else if (stored === "system") {
      resolved = systemDark ? "dark" : "light";
    } else {
      resolved = "dark";
    }
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch (_err) {}
})();
            `,
          }}
        />
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    if (location.protocol !== "file:") return;
    if (!navigator.userAgent || navigator.userAgent.indexOf("Firefox/") === -1) return;
    if (window.__HQCC_URL_PATCHED__) return;
    window.__HQCC_URL_PATCHED__ = true;

    var OriginalURL = URL;
    function PatchedURL(url, base) {
      if (base == null || base === "null") {
        base = window.location.href;
      }
      return new OriginalURL(url, base);
    }
    PatchedURL.prototype = OriginalURL.prototype;
    Object.getOwnPropertyNames(OriginalURL).forEach(function (prop) {
      try {
        if (!(prop in PatchedURL)) {
          Object.defineProperty(PatchedURL, prop, Object.getOwnPropertyDescriptor(OriginalURL, prop));
        }
      } catch (_err) {}
    });
    Object.getOwnPropertySymbols(OriginalURL).forEach(function (prop) {
      try {
        if (!(prop in PatchedURL)) {
          Object.defineProperty(PatchedURL, prop, Object.getOwnPropertyDescriptor(OriginalURL, prop));
        }
      } catch (_err) {}
    });
    window.URL = PatchedURL;
  } catch (_err) {}
})();
            `,
          }}
        />
        <style
          // Inject font-face rules using paths that are
          // relative to the current document so the export
          // can be opened from any folder or subpath.
          dangerouslySetInnerHTML={{
            __html: `
@font-face {
  font-family: "Carter Sans W01";
  src: url("./fonts/Carter Sans W01 Regular.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "Carter Sans W01";
  src: url("./fonts/Carter Sans W01 Medium.ttf") format("truetype");
  font-style: normal;
  font-weight: 550;
  font-display: swap;
}

@font-face {
  font-family: "Carter Sans W01";
  src: url("./fonts/Carter Sans W01 Bold.ttf") format("truetype");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}

@font-face {
  font-family: "HeroQuest";
  src: url("./fonts/HeroQuest.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
          `,
          }}
        />
        <AnalyticsProvider gaId={gaId}>
          <I18nProviderClient>{children}</I18nProviderClient>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
