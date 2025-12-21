import { GoogleTagManager } from "@next/third-parties/google";

import I18nProviderClient from "@/components/I18nProviderClient";

import type { Metadata, Viewport } from "next";
import type { PropsWithChildren } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

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
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
      <body>
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
        <I18nProviderClient>{children}</I18nProviderClient>
      </body>
    </html>
  );
}
