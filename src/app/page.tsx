"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AccountButton from "../components/AccountButton";

import { useAccount, useBalance, useReadContract } from 'wagmi';
import { base } from "@reown/appkit/networks";
import { useAppKit, useDisconnect } from "@reown/appkit/react";
import styles from "./page.module.css";
import { disconnect } from "node:process";
import { wagmiContractConfig } from "../config/contractAbi";
import { CONTRACT_ADDRESS } from "../config/contracts";
import { fetchFarcasterPrimaryAddress } from "../utils/farcasterApi";


export default function Dashboard() {
  const router = useRouter();

  const gmTokenAddress = CONTRACT_ADDRESS;

  const [twitterName, setTwitterName] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<string | null>(null);
  const [farcasterFid, setFarcasterFid] = useState<string | null>(null);
  const [farcasterAddress, setFarcasterAddress] = useState<string | null>(null);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const { data: isRegistered, isFetched: isFetchedIsRegistered } = useReadContract({
    ...wagmiContractConfig,
    functionName: 'isWalletRegistered',
    args: [address as `0x${string}`],
    query: {
      enabled: isConnected && authMethod === 'wallet',
    }
  });

  const effectiveAddress = authMethod === 'farcaster' ? farcasterAddress : address;

  // Load authentication method and Farcaster data on mount
  useEffect(() => {
    const storedAuthMethod = localStorage.getItem('authMethod');
    const storedFarcasterFid = localStorage.getItem('farcasterFid');
    const storedFarcasterAddress = localStorage.getItem('farcasterAddress');
    
    setAuthMethod(storedAuthMethod);
    setFarcasterFid(storedFarcasterFid);
    setFarcasterAddress(storedFarcasterAddress);
    
    // Set read-only mode for Farcaster users
    if (storedAuthMethod === 'farcaster') {
      setIsReadOnlyMode(true);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      // Only check wallet registration if using wallet auth
      if (authMethod === 'wallet' && isFetchedIsRegistered && !isRegistered) {
        await disconnect();
        router.push("/login");
      }
      
      // For Farcaster users, no registration check needed as it was done in login
    }
    checkUser();
  }, [isRegistered, isFetchedIsRegistered, authMethod]);

  useEffect(() => {
    const twitterName = localStorage.getItem("xUsername");
    if (twitterName) {
      setTwitterName(twitterName);
    }
  }, []);


  const { data: balance } = useBalance({
    address: effectiveAddress as `0x${string}`,
    token: gmTokenAddress as `0x${string}`,
    query: {
      enabled: !!effectiveAddress,
    }
  });

  const formatAddress = (address: string) => {
    if (!address || address === "Please connect wallet")
      return "Please connect wallet";
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  };

  const onDisconnect = () => {
    // Clear all stored data
    localStorage.removeItem('authMethod');
    localStorage.removeItem('farcasterFid');
    localStorage.removeItem('farcasterAddress');
    localStorage.removeItem('xUsername');
    localStorage.removeItem('xUserID');
    localStorage.removeItem('xTweetID');
    localStorage.removeItem('encryptedAccessToken');
    localStorage.removeItem('authCode');
    
    disconnect();
    router.push("/login");
  };

  return (
    <main className="container">
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
              {authMethod === 'farcaster' ? `Farcaster User (FID: ${farcasterFid})` : twitterName}
            </p>
            <div className={styles.addressContainer}>
              <p>{formatAddress(effectiveAddress as string)}</p>
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
              <p className={styles.balance}>
                {Number(balance?.value) / 1e18} {balance?.symbol}
              </p>
              {isReadOnlyMode && (
                <div style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 193, 7, 0.2)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#856404'
                }}>
                  ⚠️ Read-only mode. For transactions, use{' '}
                  <a 
                    href={`https://warpcast.com/~/developers/mini-apps/preview?url=${encodeURIComponent(window.location.origin)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#8B5CF6', textDecoration: 'underline' }}
                  >
                    Farcaster Mini-App
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
} 