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
import ConnectWallet from "../components/connectWallet/ConnectWallet";
import SendContract from "../components/SendContract/SendContract";
import SunLoader from "../components/loader/loader";
import { useWallet } from "../context/WalletContext";
import ProgressNavigation from "../components/ProgressNavigation/ProgressNavigation";
import { getErrorMessage } from "../hooks/errorHandler";

export default function Home() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);
  const [isTwitterLoading, setIsTwitterLoading] = useState(true);
  const [transactionStatus, setTransactionStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isTwitterDataLoading, setIsTwitterDataLoading] = useState(true);
  const {
    connectedWallet,
    connect,
    createAmbireWallet,
    disconnect,
    getSigner,
    getProvider,
  } = useWeb3();
  const { updateWalletInfo } = useWallet();

  useEffect(() => {
    if (connectedWallet && currentStep === 0) {
      setCurrentStep(1);
    }
  }, [connectedWallet, currentStep]);

  useEffect(() => {
    if (connectedWallet?.accounts[0]?.address) {
      updateWalletInfo(connectedWallet.accounts[0].address);
    }
  }, [connectedWallet]);

  useEffect(() => {
    const checkTwitterAuth = () => {
      const params = new URLSearchParams(window.location.search);
      const authorizationCode = params.get("code");

      if (authorizationCode) {
        console.log("Found authorization code in URL");
        setIsTwitterConnected(true);
        sessionStorage.setItem("code", authorizationCode);
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        // Set current step but keep loading state true until Twitter data is loaded
        if (connectedWallet) {
          setCurrentStep(2);
          // Keep isTwitterLoading true if we have an auth code
          setIsTwitterDataLoading(true);
        }
      } else {
        const storedCode = sessionStorage.getItem("code");
        if (storedCode) {
          setIsTwitterConnected(true);
        } else {
          setIsTwitterDataLoading(false);
        }
      }
      setIsTwitterLoading(false);
    };
    checkTwitterAuth();
  }, []);

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

      const estimatedGas = //@audit issue here previously it was working, but when i changed the contract address, it stopped working
        await contract.requestTwitterVerification.estimateGas(
          encryptedAccessToken,
          twitterUserId
        );
      console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);

      const gasPrice = await browserProvider.getFeeData();
      const totalGasCost = BigInt(estimatedGas) * gasPrice.gasPrice!;
      console.log(`💰 Gas cost: ${ethers.formatEther(totalGasCost)} ETH`);

      let transactionPromise;
      if (balance > totalGasCost * 2n) {
        console.log("🔹 Sending contract transaction...");
        const tx = await contract.requestTwitterVerification(
          encryptedAccessToken,
          twitterUserId
        );
        transactionPromise = tx.wait();
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

          transactionPromise = response.json();
        } catch (apiError: any) {
          console.error("❌ API Error:", apiError);
          throw new Error(`Relayer service error: ${apiError.message}`);
        }
      }
      const eventPromise = new Promise((resolve, reject) => {
        const infuraProvider = new ethers.WebSocketProvider(
          "wss://base-sepolia.infura.io/ws/v3/46c83ef6f9834cc49b76640eededc9f5"
        );

        const infuraContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          infuraProvider
        );

        const cleanup = () => {
          infuraContract.removeAllListeners("TwitterVerificationResult");
        };

        const timeout = setTimeout(() => {
          cleanup();
          reject(
            new Error("Transaction timeout: no event received after 60 seconds")
          );
        }, 120000); // 2 mins to wait max

        // event TwitterVerificationResult(string indexed userID, address indexed wallet, bool isSuccess, string errorMsg)
        infuraContract.on("TwitterVerificationResult", (userID, wallet, isSuccess, errorMsg) => {
          clearTimeout(timeout);
          cleanup();

          if (isSuccess) {
            console.log("✅Twitter connected event received!");
            resolve("success");
          } else {
            console.error(`❌ Twitter connect error: ${errorMsg}`);
            reject(new Error(errorMsg));
          }
        });
      });

      try {
        await Promise.all([transactionPromise, eventPromise]);
        setTransactionStatus("success");
        sessionStorage.removeItem("code");
        sessionStorage.removeItem("verifier");
      } catch (eventError: any) {
        throw new Error(`Transaction event error: ${eventError.message}`);
      }
    } catch (error: any) {
      console.error("❌ Transaction Error:", error);
      setErrorMessage(getErrorMessage(error));
      setTransactionStatus("error");
      throw error;
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

  return (
    <main className="min-h-screen bg-white">
      <ProgressNavigation
        currentStep={currentStep}
        onBack={handleBack}
        onStepChange={handleStepChange}
      />
      {isAuthorized ? (
        <div className="p-4">Authorized!</div>
      ) : (
        <div>
          {(isTwitterLoading || isTwitterDataLoading) ? (
            <main className="min-h-screen bg-white flex items-center justify-center">
              <div className={styles.loaderContainer}>
                <SunLoader />
              </div>
            </main>
          ) : (
            <>
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
                  onTwitterDataLoaded={() => setIsTwitterDataLoading(false)}
                />
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
