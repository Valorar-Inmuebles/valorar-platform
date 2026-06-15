import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteProviders } from "@/components/providers/site-providers";
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
  // Placeholder: add /brand/favicon.ico or app/favicon.ico when the tenant asset is available.
  icons: {
    icon: "/favicon.ico",
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
