import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import ClientLayout from "./client-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GM ☀️",
  description:
    "first tweet&mint coin. Let's spread GM all over the world!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThirdwebProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ThirdwebProvider>
      </body>
    </html>
  );
}
