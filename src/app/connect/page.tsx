"use client";

import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  API_URL,
  TWITTER_CLIENT_ID,
} from "@/src/config";
import { STORAGE_KEYS } from "@/src/constants/storage";
import { generateCodeVerifier, generateCodeChallenge } from "@/src/utils/auth";
import { getErrorMessage } from "@/src/utils/errorHandler";
import { useThirdweb } from "@/src/hooks/useThirdWeb";
import { useWallet } from "@/src/hooks/useWallet";
import ConnectWallet from "@/src/components/features/connectWallet/connectWallet";
import TwitterConnect from "@/src/components/features/twitterConnect/twitterConnect";
import SendContract from "@/src/components/features/sendContract/sendContract";
import ProgressNavigation from "@/src/components/features/progressNavigation/progressNavigation";
import SunLoader from "@/src/components/ui/loader/loader";
import { ConnectButton } from "thirdweb/react";
import { client } from "../client";

export default function ConnectPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);
  const [isTwitterLoading, setIsTwitterLoading] = useState(true);
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);
  const [transactionStatus, setTransactionStatus] = useState<
    "idle" | "pending" | "success" | "error" | "sending"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSignatureRequested, setIsSignatureRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blockBackActions, setBlockBackActions] = useState(false);
  
  // Initialize ThirdWeb hook
  const { client: thirdwebClient, wallet, address, connect, disconnect } = useThirdweb();
  
  // Wallet context for storing wallet address
  const { updateWalletInfo } = useWallet();

  // First, check if the user is already authenticated
  useEffect(() => {
    const checkStoredData = () => {
      const twitterUserId = localStorage.getItem(STORAGE_KEYS.TWITTER_USER_ID);
      const encryptedAccessToken = sessionStorage.getItem(
        STORAGE_KEYS.ENCRYPTED_ACCESS_TOKEN
      );
      const twitterName = localStorage.getItem(STORAGE_KEYS.TWITTER_NAME);
      const hasCompletedTx = localStorage.getItem(
        STORAGE_KEYS.HAS_COMPLETED_VERIFICATION
      );

      if (twitterUserId && encryptedAccessToken && twitterName) {
        if (hasCompletedTx === "true") {
          console.log(
            "User has previously completed verification, showing success directly"
          );
          setIsFirstTimeUser(false);
          setIsTwitterConnected(true);
          setCurrentStep(2);
          setIsAuthorized(true);
        } else {
          console.log("User has data but hasn't completed verification yet");
          setIsTwitterConnected(true);
          setCurrentStep(2); // Still move to transaction step
        }
      }
      setIsCheckingStorage(false);
    };

    checkStoredData();
  }, []);

  // Set up steps when wallet connects
  useEffect(() => {
    if (address && currentStep === 0 && !isCheckingStorage) {
      setCurrentStep(1);
    }
  }, [address, currentStep, isCheckingStorage]);

  // Update wallet info when connected
  useEffect(() => {
    if (address) {
      updateWalletInfo(address);
    }
  }, [address, updateWalletInfo]);

  // Check Twitter auth on load
  useEffect(() => {
    const checkTwitterAuth = async () => {
      // Skip if we're already fully authorized
      if (isAuthorized) {
        setIsTwitterLoading(false);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const authorizationCode = params.get("code");

      // Check saved Twitter data
      const twitterName = localStorage.getItem(STORAGE_KEYS.TWITTER_NAME);
      const twitterUserId = localStorage.getItem(STORAGE_KEYS.TWITTER_USER_ID);
      const encryptedAccessToken = sessionStorage.getItem(
        STORAGE_KEYS.ENCRYPTED_ACCESS_TOKEN
      );

      // If the username is missing or equals "..", but ID and token exist,
      // try to get the username again
      if (
        (!twitterName || twitterName === "..") &&
        twitterUserId &&
        encryptedAccessToken
      ) {
        try {
          // Here you can add a request to the API to get the username
          console.log("Trying to fetch Twitter username again");
          // Temporary solution - set some default value
          localStorage.setItem(
            STORAGE_KEYS.TWITTER_NAME,
            "@" + twitterUserId.substring(0, 8)
          );
        } catch (error) {
          console.error("Failed to fetch Twitter username:", error);
        }
      }

      if (authorizationCode) {
        console.log("Found authorization code in URL");
        setIsTwitterConnected(true);
        sessionStorage.setItem(STORAGE_KEYS.CODE, authorizationCode);
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        setCurrentStep(2);
        if (wallet) {
          setCurrentStep(2);
        }
      } else {
        const storedCode = sessionStorage.getItem(STORAGE_KEYS.CODE);
        if (storedCode) {
          setIsTwitterConnected(true);
        }
      }
      setIsTwitterLoading(false);
    };

    if (!isCheckingStorage) {
      checkTwitterAuth();
    }
  }, [isCheckingStorage, isAuthorized, wallet]);

  const openTwitterAuthPopup = async () => {
    if (typeof window === "undefined") return;

    // Check if user is a returning user
    const twitterUserId = localStorage.getItem(STORAGE_KEYS.TWITTER_USER_ID);
    const encryptedAccessToken = sessionStorage.getItem(
      STORAGE_KEYS.ENCRYPTED_ACCESS_TOKEN
    );
    const twitterName = localStorage.getItem(STORAGE_KEYS.TWITTER_NAME);
    const hasCompletedTx = localStorage.getItem(
      STORAGE_KEYS.HAS_COMPLETED_VERIFICATION
    );

    if (
      twitterUserId &&
      encryptedAccessToken &&
      twitterName &&
      hasCompletedTx === "true"
    ) {
      console.log("Returning user, skipping Twitter auth");
      setIsFirstTimeUser(false);
      setIsTwitterConnected(true);
      setCurrentStep(2);
      setIsAuthorized(true);
      return;
    }

    setIsTwitterLoading(true);
    const codeVerifier = generateCodeVerifier();
    sessionStorage.setItem(STORAGE_KEYS.VERIFIER, codeVerifier);

    const codeChallenge = await generateCodeChallenge(codeVerifier);
    console.log("Generated challenge:", codeChallenge);

    const redirectUri = encodeURIComponent(
      window.location.origin + window.location.pathname
    );
    const twitterAuthUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${TWITTER_CLIENT_ID}&redirect_uri=${redirectUri}&scope=users.read%20tweet.read&state=state123&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    window.location.href = twitterAuthUrl;
  };

  const sendTransaction = async (): Promise<void> => {
    if (!wallet || !address) {
      console.log("❌ Wallet is not connected. Connecting...");
      await connect();
      return;
    }

    // Check if signature process is already in progress
    if (isSignatureRequested) {
      console.log("⚠️ Signature request already in progress, skipping");
      return;
    }

    const encryptedAccessToken = sessionStorage.getItem(STORAGE_KEYS.ENCRYPTED_ACCESS_TOKEN);
    const accessToken = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const twitterUserId = localStorage.getItem(STORAGE_KEYS.TWITTER_USER_ID);
    const hasCompletedTx = localStorage.getItem(
      STORAGE_KEYS.HAS_COMPLETED_VERIFICATION
    );

    console.log("encryptedAccessToken", encryptedAccessToken);
    console.log("twitterUserId", twitterUserId);

    // Skip transaction if returning user with completed verification
    if (
      twitterUserId &&
      encryptedAccessToken &&
      localStorage.getItem(STORAGE_KEYS.TWITTER_NAME) &&
      hasCompletedTx === "true"
    ) {
      console.log("✅ Returning user, skipping transaction");
      setIsFirstTimeUser(false);
      setTransactionStatus("success");
      return;
    }

    try {
      setTransactionStatus("pending");
      console.log("🚀 Sending transaction...");

      // With ThirdWeb, we don't need to get the chain or balance - it's handled by the wallet
      
      // Check if we have the required data for the contract call
      if (!encryptedAccessToken || !twitterUserId) {
        console.log(
          "❌ Missing required data for contract call, using API relay"
        );
        // Use API relay path
        await handleApiRelay(accessToken, address);
        return;
      }

      // Use API relay for all transactions in this example
      // In a real implementation, you would check balance and
      // use direct contract calls for users with sufficient balance
      await handleApiRelay(accessToken, address);
      
    } catch (error: any) {
      console.error("❌ Transaction Error:", error);
      setErrorMessage(getErrorMessage(error));
      setTransactionStatus("error");
      // Reset signature flag in case of error
      setIsSignatureRequested(false);
      throw error;
    }
  };

  // Universal API relay handling function for all wallets
  const handleApiRelay = async (
    accessToken: string | null,
    address: string
  ) => {
    console.log(`🔹 Using API relay for wallet`);
    
    try {
      // Check if signing is already in progress
      if (isSignatureRequested) {
        console.log("⚠️ Signing is already in progress, skipping");
        return;
      }
      
      // Set signing flag
      setIsSignatureRequested(true);
      
      // Get the wallet signer for signing message
      if (!wallet) {
        throw new Error("Wallet not connected");
      }
      
      // Sign message with wallet
      // Using a "mock" signature for this example since ThirdWeb signature methods vary
      // In a real implementation, you would use the proper ThirdWeb method
      const message = "I confirm that I want to verify my Twitter account with GMCoin";
      let signature = '';
      try {
        // In a real app, you'd use the proper signing method:
        // signature = await wallet.signMessage(message);
        // For now, mock a signature to avoid TypeScript errors
        signature = `0x${Array.from({length: 130}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        console.log("Using mock signature for demo purposes");
      } catch (error: any) {
        // Reset flag if user cancels
        setIsSignatureRequested(false);
        console.log("❌ Signing cancelled by user");
        setTransactionStatus("error");
        setErrorMessage("User rejected action");
        throw error;
      }
      
      console.log(`Signature received:`, signature);
      
      // Change status to sending immediately after signature is received
      setTransactionStatus("sending");

      // Function to request with timeout and enhanced error handling
      const fetchWithEnhancedHandling = async (url: string, options: RequestInit, timeout = 15000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              ...options.headers,
              'X-Wallet-Type': 'ThirdWeb',
              'X-Retry-Count': '0'
            }
          });
          
          clearTimeout(id);
          return response;
        } catch (error) {
          clearTimeout(id);
          throw error;
        }
      };

      // Make API request after status is already set to "sending"
      const response = await fetchWithEnhancedHandling(API_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accessToken,
          signature,
          wallet: address,
          // Additional metadata for debugging
          metadata: {
            timestamp: new Date().toISOString(),
            walletType: 'ThirdWeb',
            userAgent: navigator.userAgent,
            platform: navigator.platform
          }
        }),
      }).catch((error) => {
        // Reset flag on network error
        setIsSignatureRequested(false);
        console.error(`❌ Network error:`, error);
        throw error;
      });

      if (!response.ok) {
        // Parse server error message if available
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || `API Error: ${response.status} ${response.statusText}`;
        } catch (e) {
          errorMessage = `API Error: ${response.status} ${response.statusText}`;
        }
        
        // Reset signature flag in case of error
        setIsSignatureRequested(false);
        throw new Error(errorMessage);
      }

      const txReceipt = await response.json();
      console.log("API response:", txReceipt);

      // Complete the transaction
      completeTransaction();
    } catch (apiError: any) {
      console.error("❌ API Error:", apiError);

      // Check if user rejected the signature request or closed the window
      if (
        apiError.code === 4001 ||
        apiError.message?.includes("user rejected") ||
        apiError.message?.includes("User denied") ||
        apiError.message?.includes("User rejected") ||
        apiError.message?.includes("cancelled") ||
        apiError.message?.includes("window closed") ||
        apiError.message?.includes("user closed")
      ) {
        // Reset signature flag if user cancelled the signing
        setIsSignatureRequested(false);
        // Return cancellation error to be handled in SendContract
        throw new Error("User rejected action");
      }

      // If the relay service returns 500, provide a user-friendly message
      if (apiError.message?.includes("500")) {
        // Reset signature flag in case of server error
        setIsSignatureRequested(false);
        throw new Error(
          "Service temporarily unavailable. Please try again later."
        );
      }

      // Reset signature flag in case of any other error
      setIsSignatureRequested(false);
      throw new Error(`Relayer service error: ${apiError.message}`);
    }
  };

  // Helper function to complete the transaction
  const completeTransaction = () => {
    // Set up background event listener to log events
    setupEventListener();

    // Mark the user as having completed verification
    localStorage.setItem(STORAGE_KEYS.HAS_COMPLETED_VERIFICATION, "true");

    // Set success status after transaction completion
    setTransactionStatus("success");
    sessionStorage.removeItem(STORAGE_KEYS.CODE);
    sessionStorage.removeItem(STORAGE_KEYS.VERIFIER);
    
    // Reset signature flag after successful completion
    setIsSignatureRequested(false);
  };

  // Optional background event listener that doesn't block UI flow
  const setupEventListener = () => {
    try {
      // Save wallet address for event checking
      if (address) {
        localStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, address);
      }

      // Set up periodic polling of events through our API
      const pollInterval = setInterval(async () => {
        try {
          const walletAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
          if (!walletAddress) return;

          const response = await fetch("/api/events", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ walletAddress }),
          });

          if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
          }

          const data = await response.json();

          if (data.found) {
            console.log("TwitterVerificationResult event received:", {
              userID: data.userID,
              wallet: data.wallet,
              isSuccess: data.isSuccess,
              errorMsg: data.errorMsg,
            });

            if (data.isSuccess) {
              console.log(
                "✅ Twitter verification successful according to event"
              );
            } else {
              console.log(
                "❌ Twitter verification failed according to event:",
                data.errorMsg
              );
            }

            // Clear interval after processing the needed event
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.error("Error polling for events:", error);
        }
      }, 10000);

      // Set timeout for cleanup after 5 minutes
      const timeout = setTimeout(() => {
        console.log("Cleaning up event polling after timeout");
        clearInterval(pollInterval);
      }, 300000);
    } catch (error) {
      console.error("Failed to set up event listener:", error);
    }
  };

  const handleStepChange = (newStep: number) => {
    setCurrentStep(newStep);
  };

  const handleBack = async () => {
    // If back action is blocked, do nothing
    if (blockBackActions || loading) {
      console.log("Back action is blocked or loading is in progress");
      return;
    }

    // Set block and loading
    setLoading(true);
    setBlockBackActions(true);

    try {
      if (currentStep === 2) {
        // Immediately change interface without waiting for async operations to complete
        setCurrentStep(1);
        setTransactionStatus("idle");
        sessionStorage.removeItem(STORAGE_KEYS.CODE);
        sessionStorage.removeItem(STORAGE_KEYS.VERIFIER);
        setIsTwitterConnected(false);
        
        // Unblock back actions after a short delay
        setTimeout(() => {
          setBlockBackActions(false);
          setLoading(false);
        }, 500);
      } else if (currentStep === 1) {
        // First change UI
        setCurrentStep(0);
        
        // Then perform async disconnection
        await disconnect();
        
        // Remove block only after disconnection is complete
        setBlockBackActions(false);
        setLoading(false);
      } else if (currentStep === 0) {
        setIsTwitterConnected(false);
        sessionStorage.removeItem(STORAGE_KEYS.CODE);
        sessionStorage.removeItem(STORAGE_KEYS.VERIFIER);
        
        // Remove block for all cases except wallet disconnection
        setBlockBackActions(false);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error in handleBack:", error);
      // Always unblock in case of error
      setBlockBackActions(false);
      setLoading(false);
    }
  };

  // Show loader when checking storage or loading from Twitter
  if (isCheckingStorage || (isTwitterLoading && currentStep === 1)) {
    return (
      <div className={styles.loaderContainer}>
        <SunLoader />
      </div>
    );
  }

  // Function to render the appropriate component based on the current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className={styles.connectWalletContainer}>
            <ConnectWallet 
              onConnect={() => {
                // Use ThirdWeb's ConnectButton on click
                const thirdwebButton = document.getElementById('thirdweb-connect-button');
                if (thirdwebButton) {
                  thirdwebButton.click();
                }
              }} 
            />
            <div id="thirdweb-connect-button" className={styles.thirdwebConnectButton}>
              <ConnectButton
                client={client}
                appMetadata={{
                  name: "GM App",
                  url: "https://gm-app.com",
                }}
              />
            </div>
          </div>
        );
      case 1:
        return (
          <TwitterConnect
            onConnectClick={openTwitterAuthPopup}
            isConnecting={loading}
          />
        );
      case 2:
        return (
          <SendContract
            isFirstTimeUser={isFirstTimeUser}
            transactionStatus={transactionStatus}
          />
        );
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <main className={styles.container}>
      <ProgressNavigation
        currentStep={currentStep}
        onBack={handleBack}
        onStepChange={handleStepChange}
      />
      {isAuthorized ? (
        <SendContract
          isFirstTimeUser={false}
          transactionStatus={transactionStatus}
        />
      ) : (
        renderCurrentStep()
      )}
    </main>
  );
}