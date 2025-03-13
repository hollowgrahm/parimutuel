import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "../components/layout/providers";
import { Navigation } from "../components/layout/Navigation";
import { ThirdwebProviderWrapper } from "../components/providers/ThirdwebProviderWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Parimutuel",
  description: "Parimutuel Perpetual Futures",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThirdwebProviderWrapper>
          <Providers>
            <Navigation />
            {children}
          </Providers>
        </ThirdwebProviderWrapper>
        <Toaster />
      </body>
    </html>
  );
}
