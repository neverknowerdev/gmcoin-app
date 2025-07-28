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
import { extractFidFromReownSocial, fetchFarcasterPrimaryAddress } from "../../utils/farcasterApi";
import { trackFarcasterLogin, trackFarcasterSignup } from "../../utils/analytics";

export default function Home() {
  const router = useRouter();
  const { open } = useAppKit();

  const [isLoading, setIsLoading] = useState(false);
  const [farcasterFid, setFarcasterFid] = useState<string | null>(null);
  const [farcasterAddress, setFarcasterAddress] = useState<string | null>(null);

  const { address, isConnected, status, embeddedWalletInfo } = useAppKitAccount();

  const { data: isRegistered, isFetched: isFetchedIsRegistered, isFetching: isFetchingIsRegistered } = useReadContract({
    ...wagmiContractConfig,
    functionName: 'isWalletRegistered',
    args: [address as `0x${string}`],
    query: {
      enabled: isConnected && !!address,
    }
  });

  const { data: isFarcasterRegistered, isFetched: isFetchedFarcasterRegistered } = useReadContract({
    ...wagmiContractConfig,
    functionName: 'isFarcasterUserRegistered',
    args: [farcasterFid as string],
    query: {
      enabled: !!farcasterFid,
    }
  });

  // Check for Farcaster login via Reown social
  useEffect(() => {
    const checkFarcasterLogin = async () => {
      const fid = extractFidFromReownSocial();
      if (fid) {
        setFarcasterFid(fid);
        
        // Fetch primary address for this FID
        const primaryAddress = await fetchFarcasterPrimaryAddress(fid);
        if (primaryAddress) {
          setFarcasterAddress(primaryAddress);
        }
      }
    };

    if (status === "connected") {
      checkFarcasterLogin();
    }
  }, [status]);

  // Handle regular wallet connection flow
  useEffect(() => {
    if (status == "connecting" || status == "connected") {
      setIsLoading(true);
    }

    if (status == "connected") {
      // If user logged in via Farcaster social
      if (farcasterFid && isFetchedFarcasterRegistered) {
        if (isFarcasterRegistered === true) {
          // Store Farcaster data for dashboard
          localStorage.setItem('farcasterFid', farcasterFid);
          localStorage.setItem('farcasterAddress', farcasterAddress || '');
          localStorage.setItem('authMethod', 'farcaster');
          
          trackFarcasterLogin(farcasterFid, farcasterAddress || undefined);
          router.push('/');
        } else {
          // Farcaster user not registered - show mini-app signup message
          trackFarcasterSignup(farcasterFid, farcasterAddress || undefined);
          setIsLoading(false);
          return;
        }
      }
      // Regular wallet connection flow
      else if (isConnected && address && isFetchedIsRegistered) {
        if (isRegistered === true) {
          localStorage.setItem('authMethod', 'wallet');
          router.push('/');
        }
        if (isRegistered === false) {
          router.push('/login/connect-x');
        }
      }
    }

  }, [isRegistered, isConnected, status, farcasterFid, isFarcasterRegistered, isFetchedFarcasterRegistered, farcasterAddress]);

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
        {farcasterFid && !isLoading && isFarcasterRegistered === false ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '12px',
            maxWidth: '400px'
          }}>
            <h2 style={{ marginBottom: '1rem', color: '#333' }}>
              Farcaster Account Not Registered
            </h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Your Farcaster account (FID: {farcasterFid}) is not registered yet. 
              Please use our Farcaster Mini-App to complete the registration process.
            </p>
            <a 
              href={`https://warpcast.com/~/developers/mini-apps/preview?url=${encodeURIComponent(window.location.origin)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#8B5CF6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 'bold'
              }}
            >
              Open Farcaster Mini-App
            </a>
          </div>
        ) : (
          <YellowButton onClick={() => open({ view: 'Connect' })}>
            Sign up
          </YellowButton>
        )}
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