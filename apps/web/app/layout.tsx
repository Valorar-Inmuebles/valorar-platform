import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteProviders } from "@/components/providers/site-providers";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { createSiteMetadata } from "@/config/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = createSiteMetadata({
  icons: {
    icon: [
      { url: BRAND_ASSETS.favicon },
      { url: BRAND_ASSETS.favicon16, sizes: "16x16", type: "image/png" },
      { url: BRAND_ASSETS.favicon32, sizes: "32x32", type: "image/png" },
    ],
    apple: BRAND_ASSETS.logo180,
  },
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <SiteProviders>{children}</SiteProviders>
      </body>
    </html>
  );
}
