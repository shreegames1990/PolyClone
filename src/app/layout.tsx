import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Polymarket Clone", template: "%s · Polymarket Clone" },
  description: "Browse and trade prediction markets powered by the Polymarket APIs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 pt-4 pb-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
