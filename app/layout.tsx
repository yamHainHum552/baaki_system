import type { Metadata, Viewport } from "next";
import { Literata, Manrope } from "next/font/google";
import { Suspense } from "react";
import { PwaRegister } from "@/components/pwa-register";
import { ToastProvider } from "@/components/toast-provider";
import { UrlToastSync } from "@/components/url-toast-sync";
import "./globals.css";

const headingFont = Literata({
  variable: "--font-heading",
  subsets: ["latin"]
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : undefined,
  title: {
    default: "Baaki",
    template: "%s | Baaki",
  },
  description: "Simple digital khata for Nepali local stores.",
  applicationName: "Baaki",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Baaki",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon" }],
    apple: [{ url: "/apple-icon" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#ab2e20",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable}`}
    >
      <body className="font-[var(--font-body)]">
        <ToastProvider>
          <PwaRegister />
          <Suspense fallback={null}>
            <UrlToastSync />
          </Suspense>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
