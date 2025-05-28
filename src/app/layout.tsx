import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import AppKitProvider from "../context/appKitProvider";
import { wagmiAdapter } from "../config/wagmi";
import { cookieToInitialState } from "wagmi";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GM Coin App",
  description: "GM Coin Application",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie");
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig, cookies);

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cherry+Bomb+One&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className}>
        <AppKitProvider initialState={initialState}>{children}</AppKitProvider>
      </body>
    </html>
  );
}
