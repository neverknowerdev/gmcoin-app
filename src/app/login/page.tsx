"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import styles from './page.module.css';
import BlueButton from "../../components/ui/buttons/BlueButton";
import YellowButton from "../../components/ui/buttons/YellowButton";
import { useReadContract } from "wagmi";
import { wagmiContractConfig } from "../../config/contractAbi";
import { useEffect, useState } from "react";
import SplashScreen from "../../components/ui/splash-screen/splash-screen";

export default function Home() {
  const router = useRouter();
  const { open } = useAppKit();

  const [isLoading, setIsLoading] = useState(false);

  const { address, isConnected, status, embeddedWalletInfo } = useAppKitAccount();

  const { data: isRegistered, isFetched: isFetchedIsRegistered, isFetching: isFetchingIsRegistered } = useReadContract({
    ...wagmiContractConfig,
    functionName: 'isWalletRegistered',
    args: [address as `0x${string}`],
    query: {
      enabled: isConnected,
    }
  });

  useEffect(() => {
    if (status == "connecting" || status == "connected") {
      setIsLoading(true);
    }

    if (status == "connected") {
      if (isConnected && isRegistered === true) {
        router.push('/');
      }
      if (isConnected && isRegistered === false) {
        router.push('/login/connect-x');
      }
    }

  }, [isRegistered, isConnected, status]);

  return (
    <main className="container">
      <SplashScreen isLoading={isLoading} />
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