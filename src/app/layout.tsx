import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchProvider } from "@/lib/utils/searchContext";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";

// Import server-side initialization script
import "@/lib/init.server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StockScreener - Stock Analysis and Screening Tool",
  description: "A powerful stock analysis and screening tool for investors in India.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SearchProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </SearchProvider>
        <Analytics />
      </body>
    </html>
  );
}
