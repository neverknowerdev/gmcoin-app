"use client";

import { ConnectButton } from "thirdweb/react";
import { client } from "../lib/client";
import { base, baseSepolia } from "thirdweb/chains";
import { logout } from "../app/actions/auth";
import { inAppWallet } from "thirdweb/wallets";
import { createWallet } from "thirdweb/wallets";

export default function AccountButton() {
  const chain = process.env.NEXT_PUBLIC_ENV == 'mainnet' ? base : baseSepolia;
  const gmTokenAddress = process.env.NEXT_PUBLIC_ENV == 'mainnet' ? "0x26f36F365E5EB6483DF4735e40f87E96e15e0007" : "0x19bD68AD19544FFA043B2c3A5064805682783E91";

  const wallets = [
    inAppWallet({
        auth: {
            options: [
                "x",
                "coinbase",
                "google",
                "apple",
                "facebook",
                "farcaster",
                "email",
                "passkey",
            ],
        },
    }),
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
    createWallet("me.rainbow"),
    createWallet("io.rabby"),
];

  return (
    <ConnectButton
        client={client}
        appMetadata={{
            name: "GM ☀️",
            url: "https://app.gmcoin.meme",
        }}
        chain={chain}
        accountAbstraction={{
            chain: chain,
            sponsorGas: true,
        }}
        onDisconnect={async () => {
            console.log('Disconnected');
            await logout();
        }}
        supportedTokens={{
                [chain.id]: [
                {
                    address: gmTokenAddress,
                    name: "GM Coin",
                    symbol: "GM",
                },
                ]
        }}
        detailsButton={{
            displayBalanceToken: {
                [chain.id]: gmTokenAddress,
            }
        }}
        wallets={wallets}
        
    />
  );
} 