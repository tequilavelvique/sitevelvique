import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Bodoni_Moda } from "next/font/google";
import type { ReactNode } from "react";
import { COPY } from "@velvique/content";
import { loadContent } from "@/lib/content";
import { BRAND } from "@/lib/brand";
import { Providers } from "@/components/providers/Providers";
import { Noise } from "@/components/bits/Noise";
import { FlashOverlay } from "@/components/motion/FlashOverlay";
import { Header } from "@/components/chrome/Header";
import { Menu } from "@/components/chrome/Menu";
import { AgeGate } from "@/components/chrome/AgeGate";
import "lenis/dist/lenis.css";
import "./globals.css";
import "./reactbits-theme.css";

const serif = Bodoni_Moda({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-serif",
  display: "swap",
});

const cond = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-cond",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://velviquetequila.com"),
  title: { default: COPY.ES.meta.title, template: "%s · Velvique" },
  description: COPY.ES.meta.description,
  applicationName: "Velvique",
  // Favicon, app icons and the share card live on Grove (the client's V monogram and wordmark), like all media.
  icons: {
    icon: [
      { url: BRAND.favicon, sizes: "48x48", type: "image/x-icon" },
      { url: BRAND.icon, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: BRAND.appleIcon, sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: COPY.ES.meta.title,
    description: COPY.ES.meta.description,
    siteName: "Velvique",
    locale: "es_MX",
    alternateLocale: ["en_US"],
    type: "website",
    images: [{ url: BRAND.shareCard, width: 1200, height: 630, alt: BRAND.shareAlt, type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: COPY.ES.meta.title,
    description: COPY.ES.meta.description,
    images: [{ url: BRAND.shareCard, width: 1200, height: 630, alt: BRAND.shareAlt }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const content = await loadContent();
  return (
    <html lang="es" className={`${serif.variable} ${cond.variable}`}>
      <body>
        <Providers content={content}>
          <Noise />
          <FlashOverlay />
          <Header />
          {children}
          <Menu />
          <AgeGate />
        </Providers>
      </body>
    </html>
  );
}
