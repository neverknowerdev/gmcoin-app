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

export default function Home() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);
  const [isTwitterLoading, setIsTwitterLoading] = useState(true);
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);
  const [transactionStatus, setTransactionStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
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
      const twitterUserId = localStorage.getItem("twitterUserId");
      const encryptedAccessToken = sessionStorage.getItem(
        "encryptedAccessToken"
      );
      const twitterName = localStorage.getItem("twitterName");
      const hasCompletedTx = localStorage.getItem(
        "hasCompletedTwitterVerification"
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
    if (connectedWallet?.accounts[0]?.address) {
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
      const twitterName = localStorage.getItem("twitterName");
      const twitterUserId = localStorage.getItem("twitterUserId");
      const encryptedAccessToken = sessionStorage.getItem("encryptedAccessToken");
      
      // If the username is missing or equals "..", but ID and token exist,
      // try to get the username again
      if ((!twitterName || twitterName === "..") && twitterUserId && encryptedAccessToken) {
        try {
          // Here you can add a request to the API to get the username
          console.log("Trying to fetch Twitter username again");
          // Temporary solution - set some default value
          localStorage.setItem("twitterName", "@" + twitterUserId.substring(0, 8));
        } catch (error) {
          console.error("Failed to fetch Twitter username:", error);
        }
      }

      if (authorizationCode) {
        console.log("Found authorization code in URL");
        setIsTwitterConnected(true);
        sessionStorage.setItem("code", authorizationCode);
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        setCurrentStep(2);
        if (connectedWallet) {
          setCurrentStep(2);
        }
      } else {
        const storedCode = sessionStorage.getItem("code");
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
    const twitterUserId = localStorage.getItem("twitterUserId");
    const encryptedAccessToken = sessionStorage.getItem("encryptedAccessToken");
    const twitterName = localStorage.getItem("twitterName");
    const hasCompletedTx = localStorage.getItem(
      "hasCompletedTwitterVerification"
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
    sessionStorage.setItem("verifier", codeVerifier);

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
  
    const encryptedAccessToken = sessionStorage.getItem('encryptedAccessToken');
    const accessToken = sessionStorage.getItem('accessToken');
    const twitterUserId = localStorage.getItem('twitterUserId');
    const hasCompletedTx = localStorage.getItem("hasCompletedTwitterVerification");
  
    console.log('encryptedAccessToken', encryptedAccessToken);
    console.log('twitterUserId', twitterUserId);
  
    // Skip transaction if returning user with completed verification
    if (twitterUserId && encryptedAccessToken && localStorage.getItem('twitterName') && hasCompletedTx === "true") {
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
      const balance = await browserProvider.getBalance(address);
      console.log(`💰 User balance: ${ethers.formatEther(balance)} ETH`);
  
      let txReceipt;
  
      // Check if method exists in contract before calling it
      if (!contract.verifyTwitterAccount) {
        throw new Error("Contract method 'verifyTwitterAccount' does not exist");
      }
      
      let txHash;
      let estimatedGas;
      let totalGasCost = BigInt(0);

      // Wrap gas estimation in try-catch to prevent errors
      try {
        // Try to estimate gas
        estimatedGas = await contract.verifyTwitterAccount.estimateGas(
          twitterUserId
        );
        console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);

        const gasPrice = await browserProvider.getFeeData();
        totalGasCost = BigInt(estimatedGas) * gasPrice.gasPrice!;
        console.log(`💰 Gas cost: ${ethers.formatEther(totalGasCost)} ETH`);
      } catch (gasError) {
        console.log("Failed to estimate gas, assuming balance is insufficient:", gasError);
        // If gas estimation fails, set a flag to use relay
        totalGasCost = balance + BigInt(1); // Set cost higher than balance
      }

      // Check user's balance and choose appropriate execution path
      if (balance > totalGasCost * 2n) {
        console.log("🔹 Sending contract transaction...");
        console.log("TwitterUserId:", twitterUserId);
        
        try {
          const tx = await contract.verifyTwitterAccount(
            twitterUserId
          );
          txHash = tx.hash;
          console.log("Transaction hash:", txHash);
          
          // Wait for transaction confirmation, but not for events
          txReceipt = await tx.wait();
          console.log("Transaction confirmed:", txReceipt);
        } catch (txError: any) {
          // Additional check in case balance check didn't catch insufficient funds
          if (txError.message?.includes("insufficient funds") || 
              txError.message?.includes("insufficient balance")) {
            throw new Error("Insufficient ETH balance to complete this transaction. Please add ETH to your wallet.");
          }
          
          // For "missing revert data" error, provide a user-friendly message
          if (txError.message?.includes("missing revert data")) {
            throw new Error("Transaction failed. Please make sure you have enough ETH in your wallet.");
          }
          
          throw txError;
        }
      } else {
        console.log("🔹 Using API relay...");
        try {
          // Force signature even when using API relay
          const signature = await signer.signMessage(
            "I confirm that I am connecting my Twitter account to GM Coin. This signature does not submit any blockchain transaction or spend any funds."
          );
          console.log("Signature received:", signature);
          
          const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken,
              signature,
              wallet: address,
            }),
          });

          if (!response.ok) {
            throw new Error(
              `API Error: ${response.status} ${response.statusText}`
            );
          }

          txReceipt = await response.json();
          console.log("API response:", txReceipt);
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
            // Return cancellation error to be handled in SendContract
            throw new Error("Transaction cancelled by user");
          }
          
          // If the relay service returns 500, provide a user-friendly message
          if (apiError.message?.includes("500")) {
            throw new Error("Service temporarily unavailable. Please try again later or add ETH to your wallet for direct transaction.");
          }
          
          throw new Error(`Relayer service error: ${apiError.message}`);
        }
      }
    
      // Set up background event listener to log events but don't wait for it
      setupEventListener();
      
      // Mark the user as having completed verification
      localStorage.setItem("hasCompletedTwitterVerification", "true");
      
      // Set success status after transaction completion
      setTransactionStatus("success");
      sessionStorage.removeItem("code");
      sessionStorage.removeItem("verifier");
    } catch (error: any) {
      console.error("❌ Transaction Error:", error);
      
      // Set error message and status
      setErrorMessage(getErrorMessage(error));
      setTransactionStatus("error");
      throw error;
    }
  };

  // Optional background event listener that doesn't block UI flow
  const setupEventListener = () => {
    try {
      // Save wallet address for event checking
      if (connectedWallet?.accounts[0]?.address) {
        localStorage.setItem("walletAddress", connectedWallet.accounts[0].address);
      }
      
      // Set up periodic polling of events through our API
      const pollInterval = setInterval(async () => {
        try {
          const walletAddress = localStorage.getItem("walletAddress");
          if (!walletAddress) return;
          
          const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
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
              console.log("✅ Twitter verification successful according to event");
            } else {
              console.log("❌ Twitter verification failed according to event:", data.errorMsg);
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
    if (currentStep === 2) {
      setCurrentStep(1);
      setTransactionStatus("idle");
      sessionStorage.removeItem("code");
      sessionStorage.removeItem("verifier");
      setIsTwitterConnected(false);
    } else if (currentStep === 1) {
      setCurrentStep(0);
      await disconnect();
    } else if (currentStep === 0) {
      setIsTwitterConnected(false);
      sessionStorage.removeItem("code");
      sessionStorage.removeItem("verifier");
    }
  };

  // If we need to create a provider on the client, use a public RPC node
  const getPublicProvider = () => {
    return new ethers.JsonRpcProvider("https://base-sepolia.public.blastapi.io");
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
            connectedWallet={connectedWallet}
            walletAddress={connectedWallet?.accounts[0]?.address || ""}
            sendTransaction={sendTransaction}
            connect={connect}
            isFirstTimeUser={false}
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
              connectedWallet={connectedWallet}
              walletAddress={connectedWallet?.accounts[0]?.address || ""}
              sendTransaction={sendTransaction}
              connect={connect}
              isFirstTimeUser={true}
            />
          )}
        </div>
      )}
    </main>
  );
}
