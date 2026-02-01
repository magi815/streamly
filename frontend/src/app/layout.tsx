import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Sans_JP, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Cloudflare Web Analytics Token
const CF_BEACON_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

// Fonts for different languages
const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-kr",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-jp",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-inter",
});

const SITE_NAME = "WhatView";
const SITE_URL = "https://whatview.magi815.workers.dev";
const SITE_DESCRIPTION = "Find where to watch movies and TV shows across streaming platforms.";

export const metadata: Metadata = {
  title: {
    default: "WhatView - Where to Watch? | OTT Search",
    template: "WhatView - %s",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "WhatView", "OTT search", "streaming search",
    "Netflix", "Disney+", "Hulu", "Amazon Prime",
    "movies", "TV shows", "where to watch"
  ],
  authors: [{ name: "WhatView" }],
  creator: "WhatView",
  publisher: "WhatView",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
    languages: {
      "ko": "/ko",
      "en": "/en",
      "ja": "/ja",
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "WhatView - Where to Watch?",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WhatView - OTT Search & Reviews",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatView - Where to Watch?",
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  category: "entertainment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body className={`${notoSansKR.variable} ${notoSansJP.variable} ${inter.variable} bg-gray-900 text-white antialiased`}>
        {children}
        {/* Cloudflare Web Analytics */}
        {CF_BEACON_TOKEN && (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${CF_BEACON_TOKEN}"}`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
