import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "../context/WalletContext";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GM ☀️",
  description: "first tweet&mint coin. Let's spread GM all over the world!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Providers>
        <WalletProvider>
          <body className={`${geistSans.variable} ${geistMono.variable}`}>
            {children}
          </body>
        </WalletProvider>
      </Providers>
    </html>
  );
}
