"use client";

import React, { useEffect, useState } from "react";
import { ethers, Contract } from "ethers";
import { useWeb3 } from "@/src/hooks/useWeb3";
import TwitterConnect from "@/src/components/TwitterConnect";
import { generateCodeVerifier, generateCodeChallenge } from "@/src/utils/auth";
import styles from "./page.module.css";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  API_URL,
  TWITTER_CLIENT_ID,
} from "@/src/config";
import ConnectWallet from "../../components/connectWallet/ConnectWallet";
import SendContract from "../../components/SendContract/SendContract";
import SunLoader from "../../components/loader/loader";
import { useWallet } from "../../context/WalletContext";
import ProgressNavigation from "../../components/ProgressNavigation/ProgressNavigation";
import { getErrorMessage } from "../../hooks/errorHandler";

export default function Home() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);
  const [isTwitterLoading, setIsTwitterLoading] = useState(true);
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);
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

  // Check for stored authentication data
  useEffect(() => {
    const checkStoredData = () => {
      const twitterUserId = localStorage.getItem("twitterUserId");
      const encryptedAccessToken = sessionStorage.getItem("encryptedAccessToken");
      const twitterName = localStorage.getItem("twitterName");
      
      if (twitterUserId && encryptedAccessToken && twitterName) {
        setIsTwitterConnected(true);
        setCurrentStep(2);
        setIsAuthorized(true);
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
    const checkTwitterAuth = () => {
      // Skip if we're already fully authorized
      if (isAuthorized) {
        setIsTwitterLoading(false);
        return;
      }
      
      const params = new URLSearchParams(window.location.search);
      const authorizationCode = params.get("code");

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

  console.log('encryptedAccessToken', encryptedAccessToken);
  console.log('twitterUserId', twitterUserId);

  try {
    setTransactionStatus("pending");
    console.log("🚀 Sending transaction...");

    const browserProvider = getProvider();
    const signer = await getSigner();
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    const address = await signer.getAddress();
    const balance = await browserProvider.getBalance(address);
    console.log(`💰 User balance: ${ethers.formatEther(balance)} ETH`);

    let txReceipt;

    const estimatedGas =
      await contract.requestTwitterVerification.estimateGas(
        encryptedAccessToken,
        twitterUserId
      );
    console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);

    const gasPrice = await browserProvider.getFeeData();
    const totalGasCost = BigInt(estimatedGas) * gasPrice.gasPrice!;
    console.log(`💰 Gas cost: ${ethers.formatEther(totalGasCost)} ETH`);

    let txHash;

    // Direct contract call path
    if (balance > totalGasCost * 2n) {
      console.log("🔹 Sending contract transaction...");
      const tx = await contract.requestTwitterVerification(
        encryptedAccessToken,
        twitterUserId
      );
      txHash = tx.hash;
      console.log("Transaction hash:", txHash);
      
      // Save transaction hash to localStorage
      localStorage.setItem("gmTransactionHash", txHash);
      
      // Wait for transaction confirmation, but not for events
      txReceipt = await tx.wait();
      console.log("Transaction confirmed:", txReceipt);
      console.log("✅ TRANSACTION SUCCESSFUL - SETTING STATUS TO SUCCESS");
      setTransactionStatus("success");
    } else {
      console.log("🔹 Using API relay...");
      try {
        const signature = await signer.signMessage(
          "gmcoin.meme twitter-verification"
        );
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken,
            signature
          }),
        });

        if (!response.ok) {
          throw new Error(
            `API Error: ${response.status} ${response.statusText}`
          );
        }

        txReceipt = await response.json();
        console.log("API response:", txReceipt);
        // Save transaction hash to localStorage
        if (txReceipt.txHash) {
          localStorage.setItem("gmTransactionHash", txReceipt.txHash);
        }
        console.log("✅ TRANSACTION SUCCESSFUL - SETTING STATUS TO SUCCESS");
        setTransactionStatus("success");
      } catch (apiError: any) {
        console.error("❌ API Error:", apiError);
        throw new Error(`Relayer service error: ${apiError.message}`);
      }
    }

    // Set up background event listener to log events but don't wait for it
    setupEventListener();
    
    sessionStorage.removeItem("code");
    sessionStorage.removeItem("verifier");
    
  } catch (error: any) {
    console.error("❌ Transaction Error:", error);
    setTransactionStatus("error");
    setErrorMessage(getErrorMessage(error));
    throw error;
  }
};
  
  // Optional background event listener that doesn't block UI flow
  const setupEventListener = () => {
    try {
      const infuraProvider = new ethers.WebSocketProvider(
        "wss://base-sepolia.infura.io/ws/v3/46c83ef6f9834cc49b76640eededc9f5"
      );
      
      const infuraContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        infuraProvider
      );
      
      // Set a timeout to clean up the listener after 5 minutes
      const timeout = setTimeout(() => {
        console.log("Cleaning up event listener after timeout");
        infuraContract.removeAllListeners("TwitterVerificationResult");
        infuraProvider.destroy();
      }, 300000); // 5 minutes
      
      infuraContract.on("TwitterVerificationResult", (userID, wallet, isSuccess, errorMsg) => {
        console.log("TwitterVerificationResult event received:", { userID, wallet, isSuccess, errorMsg });
        clearTimeout(timeout);
        
        if (isSuccess) {
          console.log("✅ Twitter verification successful according to event");
        } else {
          console.log("❌ Twitter verification failed according to event:", errorMsg);
        }
        
        // Clean up
        infuraContract.removeAllListeners("TwitterVerificationResult");
        infuraProvider.destroy();
      });
      
      infuraProvider.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    } catch (error) {
      console.error("Failed to set up event listener:", error);
      // Don't throw error as this is just a background listener
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
            transactionStatus={transactionStatus}
            connect={connect}
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
              transactionStatus={transactionStatus}
              connect={connect}
            />
          )}
        </div>
      )}
    </main>
  );
}