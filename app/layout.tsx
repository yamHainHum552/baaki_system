import type { Metadata } from "next";
import { Literata, Manrope } from "next/font/google";
import { Suspense } from "react";
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
  title: "Baaki",
  description: "Simple digital khata for Nepali local stores."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable}`}
    >
      <body className="font-[var(--font-body)]">
        <ToastProvider>
          <Suspense fallback={null}>
            <UrlToastSync />
          </Suspense>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
