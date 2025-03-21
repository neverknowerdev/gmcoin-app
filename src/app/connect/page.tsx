"use client";

import React, { useEffect, useState } from "react";
import { ethers, Contract } from "ethers";
import { useWeb3 } from "@/src/hooks/useWeb3";
import TwitterConnect from "@/src/components/features/TwitterConnect/TwitterConnect";
import { generateCodeVerifier, generateCodeChallenge } from "@/src/utils/auth";
import styles from "./page.module.css";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  API_URL,
  TWITTER_CLIENT_ID,
} from "@/src/config";
import ConnectWallet from "../../components/features/connectWallet/ConnectWallet";
import SendContract from "../../components/features/SendContract/SendContract";
import SunLoader from "../../components/ui/loader/loader";
import { useWallet } from "../../context/WalletContext";
import ProgressNavigation from "../../components/features/ProgressNavigation/ProgressNavigation";
import { getErrorMessage } from "../../hooks/errorHandler";
import { STORAGE_KEYS } from "@/src/constants/storage";

export default function Home() {
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
  const {
    connectedWallet,
    connect,
    createAmbireWallet,
    disconnect,
    getSigner,
    getProvider,
  } = useWeb3();
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

  useEffect(() => {
    if (connectedWallet && currentStep === 0 && !isCheckingStorage) {
      setCurrentStep(1);
    }
  }, [connectedWallet, currentStep, isCheckingStorage]);

  useEffect(() => {
    if (connectedWallet && connectedWallet.accounts?.[0]?.address) {
      updateWalletInfo(connectedWallet.accounts[0].address);
    }
  }, [connectedWallet, updateWalletInfo]);

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
        if (connectedWallet) {
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
  }, [isCheckingStorage, isAuthorized, connectedWallet]);

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
    if (!connectedWallet) {
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

      const browserProvider = getProvider();
      const signer = await getSigner();

      if (!browserProvider || !signer) {
        throw new Error("Failed to get provider or signer");
      }

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const address = await signer.getAddress();
      let balance = BigInt(0);
      
      try {
        // Check wallet type
        const isAmbireWallet = connectedWallet?.label === 'Ambire';
        
        if (isAmbireWallet) {
          console.log("Using alternative balance retrieval method for Ambire");
          // For Ambire we use a different way to get balance
          try {
            // First try Blockscout API
            const response = await fetch(`https://base-sepolia.blockscout.com/api/v2/addresses/${address}`);
            if (response.ok) {
              const data = await response.json();
              if (data && data.coin_balance) {
                // Convert balance from string to BigInt
                balance = ethers.parseEther(data.coin_balance);
                console.log(`Ambire wallet balance: ${ethers.formatEther(balance)} ETH`);
              } else {
                // If balance not available in API response
                console.log("Balance not available in API response, proceeding with zero balance");
                balance = BigInt(0);
              }
            } else {
              // If API response is not OK
              console.log("Blockscout API response not OK, trying fallback method");
              
              // Try using provider as fallback
              try {
                balance = await browserProvider.getBalance(address);
                console.log(`Fallback balance retrieval successful: ${ethers.formatEther(balance)} ETH`);
              } catch (fallbackError) {
                console.warn("Fallback balance retrieval also failed, continuing with zero balance");
                console.error("Fallback error:", fallbackError);
                balance = BigInt(0);
              }
            }
          } catch (apiError) {
            console.error("Error in balance retrieval for Ambire:", apiError);
            // If all balance retrieval methods failed, continue with API relay
            console.log("All balance retrieval methods failed, continuing with API relay");
            await handleApiRelay(accessToken, signer, address);
            return;
          }
        } else {
          // For regular wallets use the standard method
          try {
            balance = await browserProvider.getBalance(address);
            console.log(`💰 User balance: ${ethers.formatEther(balance)} ETH`);
          } catch (standardBalanceError) {
            console.error("❌ Error getting balance with standard method:", standardBalanceError);
            
            // For any wallet with balance retrieval issues, use API relay
            console.log("Balance retrieval failed, continuing with API relay");
            await handleApiRelay(accessToken, signer, address);
            return;
          }
        }
      } catch (balanceError) {
        console.error("❌ Error in balance retrieval flow:", balanceError);
        // If balance retrieval failed at any point, use API relay
        await handleApiRelay(accessToken, signer, address);
        return;
      }

      // Check if we have the required data for the contract call
      if (!encryptedAccessToken || !twitterUserId) {
        console.log(
          "❌ Missing required data for contract call, using API relay"
        );
        // Use API relay path
        await handleApiRelay(accessToken, signer, address);
        return;
      }

      let estimatedGas;
      let totalGasCost = BigInt(0);

      // Try to estimate gas for the contract call
      try {
        console.log("⛽ Estimating gas for requestTwitterVerification...");
        estimatedGas = await contract.requestTwitterVerification.estimateGas(
          encryptedAccessToken,
          twitterUserId
        );
        console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);

        const gasPrice = await browserProvider.getFeeData();
        totalGasCost = BigInt(estimatedGas) * gasPrice.gasPrice!;
        console.log(`💰 Gas cost: ${ethers.formatEther(totalGasCost)} ETH`);
      } catch (gasError) {
        console.log(
          "⚠️ Failed to estimate gas:",
          gasError
        );
        
        // Check for "wallet already linked for that user" error
        if ((gasError as any).message?.includes("wallet already linked for that user")) {
          console.log("✅ Wallet already linked for this user, redirecting to dashboard");
          // Save completed verification information
          localStorage.setItem("hasCompletedTwitterVerification", "true");
          localStorage.setItem("userAuthenticated", "true");
          // Redirect to dashboard
          window.location.href = "/";
          return;
        }
        
        // Display error to user instead of proceeding with API relay
        console.error("❌ Transaction Error:", gasError);
        setErrorMessage(getErrorMessage(gasError as any));
        setTransactionStatus("error");
        // Reset signature flag in case of error
        setIsSignatureRequested(false);
        throw gasError;
      }

      // Check if user has enough balance for transaction
      if (balance > totalGasCost * 2n) {
        console.log("🔹 Sending contract transaction...");
        console.log("TwitterUserId:", twitterUserId);

        try {
          // Call requestTwitterVerification with the required parameters
          const tx = await contract.requestTwitterVerification(
            encryptedAccessToken,
            twitterUserId
          );
          console.log("Transaction hash:", tx.hash);

          // Wait for transaction confirmation
          const txReceipt = await tx.wait();
          console.log("Transaction confirmed:", txReceipt);

          // Continue with the success flow
          completeTransaction();
        } catch (txError: any) {
          // Handle specific transaction errors
          if (
            txError.message?.includes("insufficient funds") ||
            txError.message?.includes("insufficient balance")
          ) {
            console.log("⚠️ Insufficient funds error");
            // Display error to user instead of proceeding with API relay
            console.error("❌ Transaction Error:", txError);
            setErrorMessage(getErrorMessage(txError));
            setTransactionStatus("error");
            // Reset signature flag in case of error
            setIsSignatureRequested(false);
            throw txError;
          }

          // Check for "wallet already linked for that user" error
          if (txError.message?.includes("wallet already linked for that user")) {
            console.log("✅ Wallet already linked for this user, redirecting to dashboard");
            // Save completed verification information
            localStorage.setItem("hasCompletedTwitterVerification", "true");
            localStorage.setItem("userAuthenticated", "true");
            // Redirect to dashboard
            window.location.href = "/";
            return;
          }

          // For other transaction errors, display error to user instead of using API relay
          console.error("❌ Transaction error:", txError);
          setErrorMessage(getErrorMessage(txError));
          setTransactionStatus("error");
          // Reset signature flag in case of error
          setIsSignatureRequested(false);
          throw txError;
        }
      } else {
        console.log("⚠️ Insufficient balance, using API relay");
        await handleApiRelay(accessToken, signer, address);
        return;
      }
    } catch (error: any) {
      console.error("❌ Transaction Error:", error);
      setErrorMessage(getErrorMessage(error));
      setTransactionStatus("error");
      // Reset signature flag in case of error
      setIsSignatureRequested(false);
      throw error;
    }
  };

  // Helper function to handle API relay path
  const handleApiRelay = async (
    accessToken: string | null,
    signer: ethers.Signer,
    address: string
  ) => {
    console.log("🔹 Using API relay...");
    try {
      // Check if signature has already been requested
      if (isSignatureRequested) {
        console.log("⚠️ Signature request already in progress, skipping");
        return;
      }
      
      // Set flag indicating signature has been requested
      setIsSignatureRequested(true);
      
      // Force signature even when using API relay
      const signature = await signer.signMessage(
        "I confirm that I want to verify my Twitter account with GMCoin"
      ).catch((error) => {
        // Reset signature flag if user cancelled the signing
        setIsSignatureRequested(false);
        console.log("❌ Signature request cancelled by user");
        setTransactionStatus("error");
        setErrorMessage("User rejected action");
        throw error;
      });
      
      console.log("Signature received:", signature);
      
      // Change status to sending after signature is received
      setTransactionStatus("sending");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          signature,
          wallet: address,
        }),
      }).catch((error) => {
        // Reset signature flag on network error
        setIsSignatureRequested(false);
        console.error("❌ Network error:", error);
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
      if (connectedWallet && connectedWallet.accounts?.[0]?.address) {
        localStorage.setItem(
          STORAGE_KEYS.WALLET_ADDRESS,
          connectedWallet.accounts[0].address
        );
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

  // If we need to create a provider on the client, use a public RPC node
  const getPublicProvider = () => {
    return new ethers.JsonRpcProvider(
      "https://base-sepolia.public.blastapi.io"
    );
  };

  if (isCheckingStorage || isTwitterLoading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className={styles.loaderContainer}>
          <SunLoader />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <ProgressNavigation
        currentStep={currentStep}
        onBack={handleBack}
        onStepChange={handleStepChange}
      />
      {isAuthorized ? (
        <div>
          <SendContract
            connectedWallet={connectedWallet as any}
            walletAddress={connectedWallet?.accounts?.[0]?.address || ""}
            sendTransaction={sendTransaction}
            connect={connect}
            isFirstTimeUser={false}
            transactionStatus={transactionStatus}
          />
        </div>
      ) : (
        <div>
          {currentStep === 0 && (
            <ConnectWallet
              onConnect={connect}
              createAmbireWallet={createAmbireWallet}
            />
          )}

          {currentStep === 1 && connectedWallet && (
            <TwitterConnect
              onConnectClick={openTwitterAuthPopup}
              isConnecting={false}
            />
          )}

          {isTwitterConnected && currentStep === 2 && (
            <SendContract
              connectedWallet={connectedWallet as any}
              walletAddress={connectedWallet?.accounts?.[0]?.address || ""}
              sendTransaction={sendTransaction}
              connect={connect}
              isFirstTimeUser={true}
              transactionStatus={transactionStatus}
            />
          )}
        </div>
      )}
    </main>
  );
}
