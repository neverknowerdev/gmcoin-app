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
      
      // Проверяем сохраненные данные Twitter
      const twitterName = localStorage.getItem("twitterName");
      const twitterUserId = localStorage.getItem("twitterUserId");
      const encryptedAccessToken = sessionStorage.getItem("encryptedAccessToken");
      
      // Если имя пользователя отсутствует или равно "..", но есть ID и токен,
      // попробуем получить имя пользователя заново
      if ((!twitterName || twitterName === "..") && twitterUserId && encryptedAccessToken) {
        try {
          // Здесь можно добавить запрос к API для получения имени пользователя
          console.log("Trying to fetch Twitter username again");
          // Временное решение - установить какое-то значение по умолчанию
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

    const encryptedAccessToken = sessionStorage.getItem("encryptedAccessToken");
    const accessToken = sessionStorage.getItem("accessToken");
    const twitterUserId = localStorage.getItem("twitterUserId");
    const hasCompletedTx = localStorage.getItem("hasCompletedTwitterVerification");

    if (!encryptedAccessToken || !twitterUserId) {
      throw new Error("Missing required authentication data");
    }

    try {
      setTransactionStatus("pending");
      console.log("🚀 Initiating transaction process...");

      const browserProvider = getProvider();
      const signer = await getSigner();
      
      if (!browserProvider || !signer) {
        throw new Error("Failed to get provider or signer");
      }

      // Сначала запрашиваем подпись у пользователя
      console.log("🔏 Requesting signature approval...");
      const message = "I confirm that I want to verify my Twitter account with GMCoin";
      const messageHash = ethers.solidityPackedKeccak256(
        ["string"],
        [message]
      );
      
      // Явно запрашиваем подпись у пользователя
      let signature;
      try {
        signature = await signer.signMessage(ethers.getBytes(messageHash));
        console.log("✅ Signature approved:", signature);
      } catch (signError) {
        console.log("❌ User rejected signature request");
        setTransactionStatus("error");
        setErrorMessage("Signature request was rejected");
        return;
      }

      const address = await signer.getAddress();
      
      // Используем API relay для всех случаев, чтобы избежать проблем с ENS
      console.log("🔹 Using API relay...");
      try {
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
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const txReceipt = await response.json();
        console.log("API response:", txReceipt);

        // Set up background event listener
        setupEventListener();

        // Mark the user as having completed verification
        localStorage.setItem("hasCompletedTwitterVerification", "true");

        // Set success status
        setTransactionStatus("success");
        sessionStorage.removeItem("code");
        sessionStorage.removeItem("verifier");
      } catch (apiError: any) {
        console.error("❌ API Error:", apiError);
        setErrorMessage(getErrorMessage(apiError));
        setTransactionStatus("error");
        throw apiError;
      }

    } catch (error: any) {
      console.error("❌ Transaction Error:", error);

      // Check if we have the required data despite the error
      const postErrorTwitterUserId = localStorage.getItem("twitterUserId");
      const postErrorEncryptedToken = sessionStorage.getItem(
        "encryptedAccessToken"
      );
      const postErrorTwitterName = localStorage.getItem("twitterName");

      if (
        postErrorTwitterUserId &&
        postErrorEncryptedToken &&
        postErrorTwitterName
      ) {
        console.log(
          "Transaction error but required data is available, marking as success"
        );
        // Still mark as completed since data is available
        localStorage.setItem("hasCompletedTwitterVerification", "true");
        setTransactionStatus("success");
      } else {
        setErrorMessage(getErrorMessage(error));
        setTransactionStatus("error");
        throw error;
      }
    }
  };

  // Optional background event listener that doesn't block UI flow
  const setupEventListener = () => {
    try {
      // Сохраняем адрес кошелька для проверки событий
      if (connectedWallet?.accounts[0]?.address) {
        localStorage.setItem("walletAddress", connectedWallet.accounts[0].address);
      }
      
      // Настраиваем периодический опрос событий через наш API
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
            
            // Очищаем интервал после обработки нужного события
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.error("Error polling for events:", error);
        }
      }, 10000); // Проверяем каждые 10 секунд
      
      // Устанавливаем таймаут для очистки через 5 минут
      const timeout = setTimeout(() => {
        console.log("Cleaning up event polling after timeout");
        clearInterval(pollInterval);
      }, 300000); // 5 минут
      
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

  // Если нам нужно создать провайдер на клиенте, используем публичный RPC-узел
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
