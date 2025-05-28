"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import styles from './page.module.css';
import BlueButton from "../../components/ui/buttons/BlueButton";
import YellowButton from "../../components/ui/buttons/YellowButton";
import { useReadContract } from "wagmi";
import { wagmiContractConfig } from "../../config/contractAbi";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { open } = useAppKit();

  const { address, isConnected, status, embeddedWalletInfo } = useAppKitAccount();

  const { data: userID, isLoading: isLoadingUserID } = useReadContract({
    ...wagmiContractConfig,
    functionName: 'userByWallet',
    args: [address as `0x${string}`],
    query: {
      enabled: isConnected,
    }
  });

  useEffect(() => {
    console.log("userID", userID);
    console.log("isConnected", isConnected);
    console.log("status", status);
    if (status == "connected") {
      if (isConnected && userID) {
        router.push('/');
      }
      if (isConnected && !userID) {
        router.push('/login/connect-x');
      }
    }

  }, [userID, isConnected, status]);

  return (
    <main className="container">
      <div className={styles.header}>
        <div className={styles.airship}>
          <img src="/image/wallet/airship.webp" alt="Airship" />
        </div>

        <svg
          className={styles.rope}
          width="500"
          height="200"
          viewBox="0 0 500 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M50 50 C150 150, 300 0, 450 150" />
        </svg>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <YellowButton onClick={() => open({ view: 'Connect' })}>
          Sign up
        </YellowButton>
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