"use client";

import Image from "next/image";
import { ConnectEmbed, useProfiles } from "thirdweb/react";
import { client } from "../../lib/client";
import { base, baseSepolia } from "thirdweb/chains";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { generatePayload, logout, login, isLoggedIn } from "../actions/auth";
import { checkIsWalletRegisteredInSmartContract } from "../actions/contract";
import { useRouter } from "next/navigation";
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const chain = process.env.NEXT_PUBLIC_ENV == 'mainnet' ? base : baseSepolia;
  const gmTokenAddress = process.env.NEXT_PUBLIC_ENV == 'mainnet' ? "0x26f36F365E5EB6483DF4735e40f87E96e15e0007" : "0x19bD68AD19544FFA043B2c3A5064805682783E91";

  const { data: profiles, isLoading, error } = useProfiles({ client });

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
    <main>
      <div className={styles.header}>
        <div className={styles.airship}>
          <img src="/image/wallet/airship.webp" alt="Airship" />
        </div>
      </div>
      <div className={styles.overlay}>
        <ConnectEmbed
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
          header={{
            title: "Sign in"
          }}
          // supportedTokens={{
          //   [chain.id]: [
          //     {
          //       address: gmTokenAddress,
          //       name: "GM Coin",
          //       symbol: "GM",
          //     },
          //   ]
          // }}
          // detailsButton={{
          //     displayBalanceToken: {
          //         [chain.id]: gmTokenAddress,
          //     }
          // }}
          // onConnect={async (params) => {
          //   console.log("onConnect", params);
          //   const isWalletRegistered = await checkIsWalletRegisteredInSmartContract();
          //   console.log("isWalletRegistered", isWalletRegistered);

          //   if(!isWalletRegistered) {
          //     router.push('/connect-x');
          //   }
          // }}

          auth={{
            isLoggedIn: async (address) => {
              console.log("checking if logged in!", { address });
              const res = await isLoggedIn();
              console.log("isLoggedIn", res);
              if (res === true) {
                const isWalletRegistered = await checkIsWalletRegisteredInSmartContract();
                console.log("isWalletRegistered", isWalletRegistered);

                if (!isWalletRegistered) {
                  if (profiles) {
                    const xProfile = profiles.find(profile => profile.type === "x");
                    if (xProfile) {
                      console.log('found X profile, redirecting to send-transaction');
                      router.push('/login/send-transaction');
                    }
                  }
                  router.push('/login/connect-x');
                } else {
                  router.push('/dashboard');
                }
              }
              return res;
            },
            doLogin: async (params) => {
              console.log("logging in!");
              await login(params);
            },
            getLoginPayload: async ({ address }) =>
              generatePayload({ address, chainId: chain.id }),
            doLogout: async () => {
              console.log("logging out!");
              await logout();
            },
          }}
          wallets={wallets}
          requireApproval={false}
        />
      </div>

      <div className={styles.decorations}>
        <div className={styles.rainbow}>
          <img src="/image/wallet/rainbow.webp" alt="Rainbow" />
        </div>

        <div className={styles.cloud1}>
          <img src="/image/wallet/cloud1.webp" alt="Cloud1" />
        </div>

        <div className={styles.cloud2}>
          <img src="/image/wallet/cloud2.webp" alt="Cloud2" />
        </div>
      </div>
    </main>
  );
}