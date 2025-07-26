"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AccountButton from "../components/AccountButton";
import SunLoader from "../components/ui/loader/loader";

import { useAccount, useBalance, useReadContract } from 'wagmi';
import { base } from "@reown/appkit/networks";
import { useAppKit, useDisconnect } from "@reown/appkit/react";
import styles from "./page.module.css";
import { disconnect } from "node:process";
import { wagmiContractConfig } from "../config/contractAbi";
import { CONTRACT_ADDRESS } from "../config/contracts";


export default function Dashboard() {
  const router = useRouter();

  const gmTokenAddress = CONTRACT_ADDRESS;

  const [twitterName, setTwitterName] = useState<string | null>(null);


  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const { data: isRegistered, isFetched: isFetchedIsRegistered, isLoading: isCheckingRegistration } = useReadContract({
    ...wagmiContractConfig,
    functionName: 'isWalletRegistered',
    args: [address as `0x${string}`],
    query: {
      enabled: isConnected,
    }
  });

  useEffect(() => {
    const checkUser = async () => {
      if (isFetchedIsRegistered && !isRegistered) {
        await disconnect();
        router.push("/login");
      }
    }
    checkUser();
  }, [isRegistered, isFetchedIsRegistered]);

  useEffect(() => {
    const twitterName = localStorage.getItem("xUsername");
    if (twitterName) {
      setTwitterName(twitterName);
    }
  }, []);


  const { data: balance, isLoading: isBalanceLoading } = useBalance({
    address: address as `0x${string}`,
    token: gmTokenAddress as `0x${string}`,
  });

  const formatAddress = (address: string) => {
    if (!address || address === "Please connect wallet")
      return "Please connect wallet";
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  };

  const onDisconnect = () => {
    disconnect();
    router.push("/login");
  };

  return (
    <main className="container">
      {isCheckingRegistration && isConnected && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ transform: 'scale(0.5)' }}>
            <SunLoader />
          </div>
        </div>
      )}
      <div className="min-h-screen w-full">
        <div className={styles.decorations}>
          <div className={styles.rainbow}>
            <img src="/image/wallet/rainbow.png" alt="Rainbow" />
          </div>
          <div className={styles.cloud1}>
            <img src="/image/wallet/cloud1.png" alt="Cloud1" />
          </div>
          <div className={styles.cloud2}>
            <img src="/image/wallet/cloud2.png" alt="Cloud2" />
          </div>
        </div>
        {/* Top navigation bar with AccountButton */}
        <div className="w-full flex justify-end" style={{ marginTop: '20px', marginRight: '20px' }}>
          <AccountButton />
        </div>


        {/* Main content */}

        <div className={`${styles.infoContainer} flex items-center justify-center`}>
          <div className={styles.cosmoman}>
            <img src="/image/cosmoman.png" alt="Cosmoman" />
          </div>

          <div className={styles.cloude}>
            <p className={styles.username}>
              {twitterName}
            </p>
            <div className={styles.addressContainer}>
              <p>{formatAddress(address as string)}</p>
              <button
                className={`${styles.iconButton} ${styles.disconnectButton}`}
                onClick={onDisconnect}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4" />
                  <path d="M18 8l4 4-4 4" />
                  <path d="M22 12H10" />
                </svg>
              </button>
            </div>
            <div className={styles.balanceContainer}>
              {isBalanceLoading ? (
                <div style={{ transform: 'scale(0.3)', transformOrigin: 'center' }}>
                  <SunLoader />
                </div>
              ) : (
                <p className={styles.balance}>
                  {Number(balance?.value) / 1e18} {balance?.symbol}
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
