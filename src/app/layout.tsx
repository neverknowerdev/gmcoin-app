import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Web3 App",
  description: "A simple Web3 application with Thirdweb authentication",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>

        <ThirdwebProvider>
          {children}
        </ThirdwebProvider>

      </body>
    </html >
  );
}
